import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'

/**
 * Sobe um ambiente de teste do Firestore Emulator carregando o firestore.rules
 * real do disco — o mesmo arquivo que vai para produção. Chame no beforeAll();
 * o RulesTestEnvironment retornado já expõe clearFirestore() (usar no
 * afterEach()) e cleanup() (usar no afterAll()).
 */
export async function withTestEnv(
  projectId = 'cotidiano-test',
): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  })
}
