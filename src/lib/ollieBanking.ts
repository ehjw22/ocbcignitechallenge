const BANKING = /\b(paynow|pay\s*now|transfer|giro|card|balance|account|ocbc|deposit|bill|scan|qr|limit|lock|unlock|overseas|swift|remit|statement|insurance|loan|invest|saving|goal|otp|scam|fraud|hacked|hotline|staff|settings|text size|read aloud)\b|转帐|轉帳|转账|轉賬|汇款|匯款|卡|余额|餘額|账单|賬單|限额|限額|海外|锁卡|鎖卡|怎樣用|如何用|怎么用|pindah|kad|wang|baki|had transaksi|tolong|誒/i

export function isBankingQuestion(message: string) {
  return BANKING.test(message.normalize('NFKC'))
}