import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let aiClient = null;

if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

/**
 * Scan a receipt or transfer proof using Gemini 1.5 Flash
 * @param {string} base64Image - Base64 encoded image string (without data:image/... prefix)
 * @param {string} mimeType - The mime type of the image (e.g. image/jpeg)
 * @returns {Promise<{ amount: number, description: string, category_type: 'income' | 'expense' }>}
 */
export const scanReceipt = async (base64Image, mimeType) => {
  if (!aiClient) {
    throw new Error('API Key Gemini belum diatur (VITE_GEMINI_API_KEY). Silakan tambahkan di .env.local');
  }

  const prompt = `
    Anda adalah asisten keuangan pintar. Analisis gambar struk, nota, atau bukti transfer ini.
    Ekstrak data berikut dan kembalikan HANYA dalam format JSON persis seperti ini:
    {
      "amount": <angka total akhir, tipe number>,
      "description": "<nama toko, penerima, atau keterangan transfer singkat>",
      "category_type": "<income atau expense>"
    }
    
    Aturan Kritis:
    1. Abaikan pajak, subtotal, atau nominal kembalian. Cari TOTAL AKHIR yang dibayar/diterima.
    2. category_type adalah "expense" jika ini adalah struk belanja/pembayaran/transfer keluar.
    3. category_type adalah "income" jika ini adalah bukti terima uang/top up/transfer masuk.
    4. HANYA KEMBALIKAN TEKS JSON SAJA, tanpa blok kode markdown (\`\`\`json), tanpa teks pendahuluan.
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ]
    });

    const text = response.text;
    
    // Clean up potential markdown formatting just in case
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json/, '');
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```/, '');
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.replace(/```$/, '');
    }
    
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Gagal memproses struk: ' + error.message);
  }
};
