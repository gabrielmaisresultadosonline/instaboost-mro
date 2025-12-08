// SquareCloud API Integration
import { 
  SquareLoginResponse, 
  SquareVerifyIGResponse, 
  SquareAddIGResponse,
  normalizeInstagramUsername 
} from '@/types/user';

const API_BASE = 'https://dashboardmroinstagramvini-online.squareweb.app';

// Login with username and password
export const loginToSquare = async (
  username: string, 
  password: string
): Promise<{ success: boolean; daysRemaining?: number; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/verificar-numero`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `numero=${encodeURIComponent(password)}&nome=${encodeURIComponent(username)}`
    });

    const data: SquareLoginResponse = await response.json();

    if (data && data.senhaCorrespondente) {
      return { 
        success: true, 
        daysRemaining: data.diasRestantes || 365 // default to 365 if not provided
      };
    } else {
      return { success: false, error: 'Usuário ou senha incorretos' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Erro ao conectar com o servidor' };
  }
};

// Verify registered Instagram accounts for a user
export const verifyRegisteredIGs = async (
  username: string
): Promise<{ success: boolean; instagrams?: string[]; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/verificar-usuario-instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    const data: SquareVerifyIGResponse = await response.json();

    if (data && data.success) {
      const allIGs = [
        ...(data.igInstagram || []),
        ...(data.igTesteUserMro || [])
      ].map(ig => normalizeInstagramUsername(ig));
      
      return { success: true, instagrams: allIGs };
    } else {
      return { success: true, instagrams: [] };
    }
  } catch (error) {
    console.error('Verify IGs error:', error);
    return { success: false, error: 'Erro ao verificar contas' };
  }
};

// Add Instagram account to user
export const addIGToSquare = async (
  username: string,
  instagram: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const normalizedIG = normalizeInstagramUsername(instagram);
    
    const response = await fetch(`${API_BASE}/adicionar-ig`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        newUsernameUser: username, 
        IgsUsers: normalizedIG 
      })
    });

    const data: SquareAddIGResponse = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.message || 'Não foi possível adicionar o Instagram' };
    }
  } catch (error) {
    console.error('Add IG error:', error);
    return { success: false, error: 'Erro ao adicionar Instagram' };
  }
};

// Save email and print to SquareCloud
export const saveEmailAndPrint = async (
  email: string,
  username: string,
  instagram: string,
  printBlob: Blob
): Promise<{ success: boolean; error?: string }> => {
  try {
    const normalizedIG = normalizeInstagramUsername(instagram);
    
    const formData = new FormData();
    formData.append('prints', printBlob, `${normalizedIG}_profile.jpg`);
    formData.append('email', email);
    formData.append('newUsernameUser', username);
    formData.append('IgsUsers', normalizedIG);
    formData.append('dataDeEnvio', new Date().toISOString());

    const response = await fetch(`${API_BASE}/saveEmail`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      return { success: true };
    } else {
      const text = await response.text();
      console.error('saveEmail error:', text);
      return { success: false, error: 'Erro ao salvar dados' };
    }
  } catch (error) {
    console.error('Save email/print error:', error);
    return { success: false, error: 'Erro ao enviar dados' };
  }
};

// Check how many IGs user can register
export const getAvailableIGSlots = async (
  username: string
): Promise<{ available: number; total: number }> => {
  try {
    const result = await verifyRegisteredIGs(username);
    const registered = result.instagrams?.length || 0;
    // Assuming max 6 IGs per user - adjust as needed
    const maxIGs = 6;
    return { available: maxIGs - registered, total: maxIGs };
  } catch {
    return { available: 0, total: 6 };
  }
};
