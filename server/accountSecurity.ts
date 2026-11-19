export function isAccountSecurityMessage(text: string) {
  return /hacked|someone (logged|got) into|unauthori[sz]ed|account (was )?compromised|think someone hacked|被盗|被盜|帐户被|帳戶被|被黑|godam|ஹேக்/i.test(text.trim())
}