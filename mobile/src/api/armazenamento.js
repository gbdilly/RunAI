// mobile/src/api/armazenamento.js
import { Platform } from 'react-native';
import * as SecureStoreNativo from 'expo-secure-store';

// SecureStore no celular, localStorage no navegador
export const armazenamento = {
  async get(chave) {
    if (Platform.OS === 'web') return window.localStorage.getItem(chave);
    return SecureStoreNativo.getItemAsync(chave);
  },
  async set(chave, valor) {
    if (Platform.OS === 'web') return window.localStorage.setItem(chave, valor);
    return SecureStoreNativo.setItemAsync(chave, valor);
  },
  async remove(chave) {
    if (Platform.OS === 'web') return window.localStorage.removeItem(chave);
    return SecureStoreNativo.deleteItemAsync(chave);
  },
};