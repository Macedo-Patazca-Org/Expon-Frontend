export interface User {
  id: number;
  email: string;
  name: string;
  lastname: string;
  gender?: string; // Opcional, si decides incluirlo
  // Puedes agregar más campos: gender, planType, etc.
}