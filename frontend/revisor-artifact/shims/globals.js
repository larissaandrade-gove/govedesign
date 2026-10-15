// Globais de Node usadas pelos módulos do backend reaproveitados no navegador.
import { Buffer } from 'buffer';

if (!globalThis.Buffer) globalThis.Buffer = Buffer;
