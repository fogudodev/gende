/**
 * PIX BRCode (EMV) payload generator for "Copia e Cola"
 * Based on the EMV QR Code specification used by the Brazilian Central Bank (BCB).
 */

function pad(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  const polynomial = 0x1021;
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixPayloadParams {
  /** PIX key (CPF, CNPJ, email, phone, or random key) */
  pixKey: string;
  /** Beneficiary name (max 25 chars, no accents) */
  beneficiaryName: string;
  /** City (max 15 chars, no accents) */
  city?: string;
  /** Transaction amount (optional for static QR) */
  amount?: number;
  /** Transaction identifier / description (max 25 chars) */
  txId?: string;
}

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "");
}

export function generatePixPayload({
  pixKey,
  beneficiaryName,
  city = "SAO PAULO",
  amount,
  txId = "***",
}: PixPayloadParams): string {
  // 00 - Payload Format Indicator
  let payload = pad("00", "01");

  // 26 - Merchant Account Information (PIX)
  const gui = pad("00", "BR.GOV.BCB.PIX");
  const key = pad("01", pixKey);
  payload += pad("26", gui + key);

  // 52 - Merchant Category Code (0000 = not informed)
  payload += pad("52", "0000");

  // 53 - Transaction Currency (986 = BRL)
  payload += pad("53", "986");

  // 54 - Transaction Amount (optional)
  if (amount && amount > 0) {
    payload += pad("54", amount.toFixed(2));
  }

  // 58 - Country Code
  payload += pad("58", "BR");

  // 59 - Merchant Name
  const name = removeAccents(beneficiaryName).toUpperCase().slice(0, 25);
  payload += pad("59", name);

  // 60 - Merchant City
  const cityClean = removeAccents(city).toUpperCase().slice(0, 15);
  payload += pad("60", cityClean);

  // 62 - Additional Data Field Template
  const txIdField = pad("05", txId.slice(0, 25));
  payload += pad("62", txIdField);

  // 63 - CRC16 (placeholder + calculation)
  payload += "6304";
  const crc = crc16(payload);
  payload += crc;

  return payload;
}
