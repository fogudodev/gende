import { describe, it, expect } from "vitest";
import { isWithinInterval, parseISO, startOfMonth, endOfMonth, format } from "date-fns";

interface Commission {
  id: string;
  employee_id: string;
  booking_amount: number;
  commission_percentage: number;
  commission_amount: number;
  status: string;
  created_at: string;
}

function filterCommissions(
  commissions: Commission[],
  startDate: string,
  endDate: string,
  selectedEmployee: string,
  statusFilter: string,
) {
  return commissions.filter((c) => {
    const date = parseISO(c.created_at);
    const inRange = isWithinInterval(date, {
      start: parseISO(startDate),
      end: new Date(parseISO(endDate).getTime() + 86400000),
    });
    const matchEmployee = selectedEmployee === "all" || c.employee_id === selectedEmployee;
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return inRange && matchEmployee && matchStatus;
  });
}

function aggregateByEmployee(
  commissions: Commission[],
  employeeMap: Record<string, string>,
) {
  const map: Record<string, { name: string; total: number; pending: number; paid: number; count: number }> = {};
  commissions.forEach((c) => {
    if (!map[c.employee_id]) {
      map[c.employee_id] = { name: employeeMap[c.employee_id] || "—", total: 0, pending: 0, paid: 0, count: 0 };
    }
    map[c.employee_id].total += c.commission_amount;
    map[c.employee_id].count++;
    if (c.status === "pending") map[c.employee_id].pending += c.commission_amount;
    else if (c.status === "paid") map[c.employee_id].paid += c.commission_amount;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

const sampleCommissions: Commission[] = [
  { id: "1", employee_id: "emp1", booking_amount: 100, commission_percentage: 50, commission_amount: 50, status: "pending", created_at: "2026-02-01T10:00:00Z" },
  { id: "2", employee_id: "emp1", booking_amount: 200, commission_percentage: 50, commission_amount: 100, status: "paid", created_at: "2026-02-10T10:00:00Z" },
  { id: "3", employee_id: "emp2", booking_amount: 150, commission_percentage: 40, commission_amount: 60, status: "pending", created_at: "2026-02-15T10:00:00Z" },
  { id: "4", employee_id: "emp2", booking_amount: 300, commission_percentage: 40, commission_amount: 120, status: "paid", created_at: "2026-01-05T10:00:00Z" },
];

const employeeMap: Record<string, string> = {
  emp1: "Maria Silva",
  emp2: "João Santos",
};

describe("Commission Report Filters", () => {
  it("filters by date range correctly", () => {
    const result = filterCommissions(sampleCommissions, "2026-02-01", "2026-02-28", "all", "all");
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.id)).toEqual(["1", "2", "3"]);
  });

  it("excludes commissions outside date range", () => {
    const result = filterCommissions(sampleCommissions, "2026-02-01", "2026-02-28", "all", "all");
    expect(result.find((c) => c.id === "4")).toBeUndefined();
  });

  it("filters by employee", () => {
    const result = filterCommissions(sampleCommissions, "2026-01-01", "2026-12-31", "emp1", "all");
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.employee_id === "emp1")).toBe(true);
  });

  it("filters by status", () => {
    const result = filterCommissions(sampleCommissions, "2026-01-01", "2026-12-31", "all", "pending");
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.status === "pending")).toBe(true);
  });

  it("combines employee + status filters", () => {
    const result = filterCommissions(sampleCommissions, "2026-01-01", "2026-12-31", "emp1", "paid");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("returns empty for non-matching filters", () => {
    const result = filterCommissions(sampleCommissions, "2026-03-01", "2026-03-31", "all", "all");
    expect(result).toHaveLength(0);
  });
});

describe("Commission Report Aggregation", () => {
  it("aggregates totals by employee", () => {
    const filtered = filterCommissions(sampleCommissions, "2026-02-01", "2026-02-28", "all", "all");
    const agg = aggregateByEmployee(filtered, employeeMap);
    expect(agg).toHaveLength(2);
  });

  it("calculates pending and paid correctly", () => {
    const filtered = filterCommissions(sampleCommissions, "2026-02-01", "2026-02-28", "all", "all");
    const agg = aggregateByEmployee(filtered, employeeMap);
    const maria = agg.find((e) => e.name === "Maria Silva")!;
    expect(maria.pending).toBe(50);
    expect(maria.paid).toBe(100);
    expect(maria.total).toBe(150);
    expect(maria.count).toBe(2);
  });

  it("sorts by total descending", () => {
    const filtered = filterCommissions(sampleCommissions, "2026-02-01", "2026-02-28", "all", "all");
    const agg = aggregateByEmployee(filtered, employeeMap);
    expect(agg[0].total).toBeGreaterThanOrEqual(agg[1].total);
  });
});

describe("Commission Payment Notification Data", () => {
  it("aggregates payment totals per employee", () => {
    const ids = ["1", "3"]; // pending ones
    const comms = sampleCommissions.filter((c) => ids.includes(c.id));
    const empTotals: Record<string, number> = {};
    comms.forEach((c) => {
      empTotals[c.employee_id] = (empTotals[c.employee_id] || 0) + c.commission_amount;
    });
    expect(empTotals["emp1"]).toBe(50);
    expect(empTotals["emp2"]).toBe(60);
    expect(Object.keys(empTotals)).toHaveLength(2);
  });
});
