// Inicialização única do app Firebase e conexão com os emuladores em
// desenvolvimento. D-20: VITE_FIREBASE_API_KEY é pública por design — ela
// identifica o projeto, não protege dado nenhum. Quem protege os dados são
// as Security Rules (firestore.rules), não esta chave.
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

// Um espaço sobrando no fim de uma linha do .env.local custou horas de
// investigação: o projectId virava "planner-76064 ", o Firestore tentava
// falar com um projeto inexistente, e o SDK esperava PARA SEMPRE sem lançar
// erro nenhum — enquanto o Auth seguia funcionando (usa apiKey/authDomain,
// não projectId). O trim mata a classe inteira do bug; a validação converte
// "config faltando" de espera infinita em falha imediata e legível.
const usandoEmuladores = import.meta.env.VITE_USE_EMULATORS === 'true'
// Em teste (vitest) nunca ha config real, e nao deve haver: os testes falam
// com o emulador ou com mocks.
const emTeste = import.meta.env.MODE === 'test'

function envObrigatoria(nome: string, valor: unknown): string {
  const limpo = typeof valor === 'string' ? valor.trim() : ''
  // Com emulador (e nos testes) a config nao precisa ser real — o emulador
  // nao valida credencial. A exigencia vale para producao, que e onde um
  // campo faltando vira espera infinita.
  if (!limpo && (usandoEmuladores || emTeste)) return 'demo-emulador'
  if (!limpo) {
    throw new Error(
      `Config do Firebase incompleta: ${nome} está ausente ou vazia no .env.local. ` +
        'Copie os valores do console do Firebase (Configurações do projeto > Seus apps).',
    )
  }
  return limpo
}

const firebaseConfig = {
  apiKey: envObrigatoria('VITE_FIREBASE_API_KEY', import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: envObrigatoria('VITE_FIREBASE_AUTH_DOMAIN', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: envObrigatoria('VITE_FIREBASE_PROJECT_ID', import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: envObrigatoria(
    'VITE_FIREBASE_STORAGE_BUCKET',
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  ),
  messagingSenderId: envObrigatoria(
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: envObrigatoria('VITE_FIREBASE_APP_ID', import.meta.env.VITE_FIREBASE_APP_ID),
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
