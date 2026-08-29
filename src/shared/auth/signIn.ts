import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { auth } from '../firebase/client'

// signInWithPopup, NÃO signInWithRedirect.
//
// O plano original escolheu redirect com base numa recomendação que a própria
// 01-RESEARCH.md §Lacunas marcou como NÃO VERIFICADA — e ela estava errada na
// prática. O redirect depende de armazenamento cross-origin entre a origem do
// app e o authDomain (`<projeto>.firebaseapp.com`); com o fim dos cookies de
// terceiros no Chrome/Edge, esse acesso é bloqueado. O sintoma tem duas caras:
//
//   1. O login não completa — o retorno do Google acontece, mas
//      getRedirectResult não acha o estado pendente e a sessão nunca fecha.
//   2. Pior e mais difícil de achar: com uma sessão antiga ainda em cache, o
//      uid existe, mas a RENOVAÇÃO do ID token passa pelo mesmo caminho
//      bloqueado e nunca resolve. O Firestore fica esperando credencial para
//      sempre — pendura sem lançar erro nenhum.
//
// O popup mantém tudo na mesma janela/origem e não depende desse
// armazenamento. É também o que o próprio Firebase passou a recomendar.
export function signInWithGoogle(): Promise<void> {
  return signInWithPopup(auth, new GoogleAuthProvider()).then(() => undefined)
}

export function signOutOfApp(): Promise<void> {
  return signOut(auth)
}
