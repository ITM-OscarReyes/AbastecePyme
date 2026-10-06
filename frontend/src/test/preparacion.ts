/**
 * Preparación de las pruebas de interfaz de F1.
 *
 * Las pruebas no sustituyen la API por dobles: apuntan el cliente de API al
 * backend real levantado por HTTP (`ABASTECEPYME_API_URL`), de modo que lo que
 * se muestra en pantalla es lo que devuelve el backend (AC-F1-14).
 */
import '@testing-library/jest-dom/vitest';
import { apiClient } from '../services/api';

const urlApi = process.env.ABASTECEPYME_API_URL ?? 'http://127.0.0.1:8000';

apiClient.defaults.baseURL = `${urlApi}/api/v1`;
