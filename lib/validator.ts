import validator from 'validator'

export function validateTransfer(data: any) {
  const errors: string[] = []

  // Email validieren
  if (!validator.isEmail(data.recipientEmail)) {
    errors.push('Ungültige Email-Adresse')
  }

  // Betrag validieren
  if (!data.amount || data.amount <= 0 || isNaN(data.amount)) {
    errors.push('Ungültiger Betrag')
  }

  // Maximale Beträge
  if (data.amount > 10000) {
    errors.push('Maximal 10.000€ pro Transaktion')
  }

  // Referenz (optional) - Länge begrenzen
  if (data.reference && data.reference.length > 100) {
    errors.push('Verwendungszweck zu lang (max. 100 Zeichen)')
  }

  return errors
}

export function validateMerchantPayment(data: any) {
  const errors: string[] = []

  if (!data.amount || data.amount <= 0 || isNaN(data.amount)) {
    errors.push('Ungültiger Betrag')
  }

  if (data.amount > 100000) {
    errors.push('Maximal 100.000 pro Zahlungsanforderung')
  }

  if (data.currency && typeof data.currency !== 'string') {
    errors.push('Ungültige Währung')
  }

  if (data.reference && data.reference.length > 100) {
    errors.push('Referenz zu lang (max. 100 Zeichen)')
  }

  return errors
}