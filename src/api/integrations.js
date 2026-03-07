import { supabase } from './supabaseClient';

// Upload de arquivos usando Supabase Storage
export const UploadFile = async ({ file, bucket = 'uploads' }) => {
  const fileName = `${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return { url: publicUrl, file_url: publicUrl, path: data.path };
};

export const UploadPrivateFile = async ({ file, bucket = 'private' }) => {
  const fileName = `${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);

  if (error) throw error;
  return { path: data.path };
};

export const CreateFileSignedUrl = async ({ path, bucket = 'private', expiresIn = 3600 }) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return { signedUrl: data.signedUrl };
};

// Stubs para funções que precisam de implementação via Edge Functions
export const InvokeLLM = async (data) => {
  console.warn('InvokeLLM: Implementar via Supabase Edge Function com OpenAI/Anthropic');
  throw new Error('Função não implementada. Configure uma Edge Function no Supabase.');
};

export const SendEmail = async (data) => {
  console.warn('SendEmail: Implementar via Supabase Edge Function com Resend/SendGrid');
  throw new Error('Função não implementada. Configure uma Edge Function no Supabase.');
};

export const GenerateImage = async (data) => {
  console.warn('GenerateImage: Implementar via Supabase Edge Function');
  throw new Error('Função não implementada. Configure uma Edge Function no Supabase.');
};

export const ExtractDataFromUploadedFile = async (data) => {
  console.warn('ExtractDataFromUploadedFile: Implementar via Supabase Edge Function');
  throw new Error('Função não implementada. Configure uma Edge Function no Supabase.');
};

// Core namespace para compatibilidade
export const Core = {
  InvokeLLM,
  SendEmail,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
  CreateFileSignedUrl,
  UploadPrivateFile
};
