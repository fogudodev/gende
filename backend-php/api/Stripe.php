<?php
/**
 * Stripe Integration (Checkout, Subscription Check, Portal, Addon Purchase)
 * Replaces: create-checkout, check-subscription, customer-portal, purchase-addon, sync-employee-billing
 * Requires: composer require stripe/stripe-php
 */

namespace Api;

use Core\Auth;
use Core\Database;
use Core\Response;

class Stripe
{
    private \PDO $db;
    private string $stripeKey;

    private const VALID_PRICES = [
        'price_1T57OUFjVGP9lWs08ZViwOdY', // essencial monthly
        'price_1T5DskFjVGP9lWs0IjaVXqPL', // essencial annual
        'price_1T57PnFjVGP9lWs0YWLEVvBZ', // enterprise monthly
        'price_1T5Du2FjVGP9lWs0iO6PN4eF', // enterprise annual
    ];

    private const PRODUCT_TO_PLAN = [
        'prod_U3DqJqyo9urw60' => 'essencial',
        'prod_U3KXrtuJF9WAOC' => 'essencial',
        'prod_U3DrWGOLjl8pSx' => 'enterprise',
        'prod_U3KZFQMZF4cxPs' => 'enterprise',
    ];

    private const ADDON_PACKAGES = [
        'price_1T7H4vFjVGP9lWs0BKNJX8I3' => ['type' => 'reminders', 'quantity' => 10],
        'price_1T7H6MFjVGP9lWs0Wcq9WHwV' => ['type' => 'reminders', 'quantity' => 25],
        'price_1T7H8fFjVGP9lWs0zrDZP5GZ' => ['type' => 'reminders', 'quantity' => 50],
        'price_1T7HWPFjVGP9lWs0NdSjwuwO' => ['type' => 'campaigns', 'quantity' => 5],
        'price_1T7HWjFjVGP9lWs03IzoPU8w' => ['type' => 'campaigns', 'quantity' => 15],
        'price_1T7HXIFjVGP9lWs023qLe4y1' => ['type' => 'campaigns', 'quantity' => 30],
        'price_1T7HXcFjVGP9lWs0pUGKjxSb' => ['type' => 'contacts', 'quantity' => 20],
        'price_1T7HXpFjVGP9lWs0FBVYdSZa' => ['type' => 'contacts', 'quantity' => 50],
        'price_1T7HYzFjVGP9lWs0K0QZWPzr' => ['type' => 'contacts', 'quantity' => 100],
    ];

    public function __construct()
    {
        $this->db = Database::getInstance();
        $config = require __DIR__ . '/../config/app.php';
        $this->stripeKey = $config['stripe_secret_key'] ?? '';
    }

    private function stripe(): \Stripe\StripeClient
    {
        return new \Stripe\StripeClient($this->stripeKey);
    }

    public function createCheckout(array $data): void
    {
        $user = Auth::requireAuth();
        $priceId = $data['priceId'] ?? '';
        if (!$priceId || !in_array($priceId, self::VALID_PRICES)) {
            Response::error('Invalid price ID');
            return;
        }

        $stripe = $this->stripe();
        $email = $user['email'];
        $customers = $stripe->customers->all(['email' => $email, 'limit' => 1]);
        $customerId = $customers->data[0]->id ?? null;

        $origin = $_SERVER['HTTP_ORIGIN'] ?? 'https://gende.io';
        $session = $stripe->checkout->sessions->create([
            'customer' => $customerId,
            'customer_email' => $customerId ? null : $email,
            'line_items' => [['price' => $priceId, 'quantity' => 1]],
            'mode' => 'subscription',
            'success_url' => "{$origin}/settings?subscription=success",
            'cancel_url' => "{$origin}/settings?subscription=cancelled",
        ]);

        Response::success(['url' => $session->url]);
    }

    public function checkSubscription(): void
    {
        $user = Auth::requireAuth();
        $stripe = $this->stripe();
        $email = $user['email'];

        $customers = $stripe->customers->all(['email' => $email, 'limit' => 1]);
        if (empty($customers->data)) {
            Response::success(['subscribed' => false, 'plan' => 'none']);
            return;
        }

        $subscriptions = $stripe->subscriptions->all(['customer' => $customers->data[0]->id, 'status' => 'active', 'limit' => 1]);
        if (empty($subscriptions->data)) {
            Response::success(['subscribed' => false, 'plan' => 'none']);
            return;
        }

        $sub = $subscriptions->data[0];
        $productId = $sub->items->data[0]->price->product;
        $plan = self::PRODUCT_TO_PLAN[$productId] ?? 'none';

        Response::success([
            'subscribed' => true,
            'plan' => $plan,
            'product_id' => $productId,
            'subscription_end' => date('c', $sub->current_period_end),
        ]);
    }

    public function customerPortal(): void
    {
        $user = Auth::requireAuth();
        $stripe = $this->stripe();
        $customers = $stripe->customers->all(['email' => $user['email'], 'limit' => 1]);
        if (empty($customers->data)) { Response::error('No Stripe customer found'); return; }

        $origin = $_SERVER['HTTP_ORIGIN'] ?? 'https://gende.io';
        $session = $stripe->billingPortal->sessions->create([
            'customer' => $customers->data[0]->id,
            'return_url' => "{$origin}/settings",
        ]);

        Response::success(['url' => $session->url]);
    }

    public function purchaseAddon(array $data): void
    {
        $user = Auth::requireAuth();
        $action = $data['action'] ?? '';

        if ($action === 'create-checkout') {
            $priceId = $data['priceId'] ?? '';
            $addon = self::ADDON_PACKAGES[$priceId] ?? null;
            if (!$addon) { Response::error('Pacote inválido'); return; }

            $stripe = $this->stripe();
            $customers = $stripe->customers->all(['email' => $user['email'], 'limit' => 1]);
            $customerId = $customers->data[0]->id ?? null;

            $origin = $_SERVER['HTTP_ORIGIN'] ?? 'https://gende.io';
            $session = $stripe->checkout->sessions->create([
                'customer' => $customerId,
                'customer_email' => $customerId ? null : $user['email'],
                'line_items' => [['price' => $priceId, 'quantity' => 1]],
                'mode' => 'payment',
                'success_url' => "{$origin}/campaigns?addon_session_id={CHECKOUT_SESSION_ID}",
                'cancel_url' => "{$origin}/campaigns",
                'metadata' => [
                    'professional_id' => $data['professionalId'],
                    'addon_type' => $addon['type'],
                    'addon_quantity' => (string)$addon['quantity'],
                ],
            ]);
            Response::success(['url' => $session->url]);

        } elseif ($action === 'verify-payment') {
            $stripe = $this->stripe();
            $session = $stripe->checkout->sessions->retrieve($data['sessionId']);
            if ($session->payment_status !== 'paid') { Response::success(['success' => false, 'error' => 'Pagamento não confirmado']); return; }

            $addonType = $session->metadata->addon_type;
            $addonQuantity = (int)$session->metadata->addon_quantity;
            $profId = $data['professionalId'];

            $columnMap = ['reminders' => 'extra_reminders_purchased', 'campaigns' => 'extra_campaigns_purchased', 'contacts' => 'extra_contacts_purchased'];
            $column = $columnMap[$addonType] ?? null;
            if (!$column) { Response::error('Invalid addon type'); return; }

            $stmt = $this->db->prepare('SELECT * FROM professional_limits WHERE professional_id = ?');
            $stmt->execute([$profId]);
            $current = $stmt->fetch();

            if ($current) {
                $this->db->prepare("UPDATE professional_limits SET {$column} = {$column} + ? WHERE professional_id = ?")->execute([$addonQuantity, $profId]);
            } else {
                $this->db->prepare("INSERT INTO professional_limits (id, professional_id, {$column}) VALUES (?, ?, ?)")->execute([Database::uuid(), $profId, $addonQuantity]);
            }

            $this->db->prepare('INSERT INTO addon_purchases (id, professional_id, addon_type, quantity, amount_cents, stripe_session_id) VALUES (?, ?, ?, ?, ?, ?)')->execute([
                Database::uuid(), $profId, $addonType, $addonQuantity, $session->amount_total ?? 0, $data['sessionId'],
            ]);

            Response::success(['success' => true, 'type' => $addonType, 'quantity' => $addonQuantity]);
        }
    }

    public function syncEmployeeBilling(array $data): void
    {
        $user = Auth::requireAuth();
        $activeCount = $data['activeEmployeeCount'] ?? 0;
        $extraEmployees = max(0, $activeCount - 5);

        $stripe = $this->stripe();
        $customers = $stripe->customers->all(['email' => $user['email'], 'limit' => 1]);
        if (empty($customers->data)) {
            Response::success(['success' => true, 'skipped' => true, 'extra_employees' => $extraEmployees]);
            return;
        }

        $subscriptions = $stripe->subscriptions->all(['customer' => $customers->data[0]->id, 'status' => 'active', 'limit' => 1]);
        if (empty($subscriptions->data)) { Response::error('No active subscription found'); return; }

        $sub = $subscriptions->data[0];
        $existingItem = null;
        foreach ($sub->items->data as $item) {
            if ($item->price->product === 'prod_U3KrydRhlXjRr4') { $existingItem = $item; break; }
        }

        if ($extraEmployees > 0) {
            if ($existingItem) {
                $stripe->subscriptionItems->update($existingItem->id, ['quantity' => $extraEmployees]);
            } else {
                $stripe->subscriptionItems->create(['subscription' => $sub->id, 'price' => 'price_1T5EBbFjVGP9lWs0mTpdPlol', 'quantity' => $extraEmployees]);
            }
        } elseif ($existingItem) {
            $stripe->subscriptionItems->delete($existingItem->id, ['proration_behavior' => 'create_prorations']);
        }

        Response::success(['success' => true, 'extra_employees' => $extraEmployees]);
    }
}
