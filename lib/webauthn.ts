export class WebAuthnService {
  // Prüfen ob Biometrie verfügbar ist
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential !== undefined
  }

  // Biometrie registrieren
  static async register() {
    if (!this.isAvailable()) {
      return { 
        success: false, 
        error: 'Biometrie nicht verfügbar' 
      }
    }

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { 
            id: window.location.hostname,
            name: "MoneyTransfer Pro" 
          },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: "user",
            displayName: "User"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          }
        }
      })
      
      return { success: true, credential }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Biometrie Registrierung fehlgeschlagen'
      }
    }
  }

  // Mit Biometrie einloggen
  static async authenticate() {
    if (!this.isAvailable()) return null

    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          userVerification: "required"
        }
      })
      
      return credential
    } catch (error) {
      return null
    }
  }
}
