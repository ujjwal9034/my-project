import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Helper to get full image URL from a product imageUrl field
export function getImageUrl(imageUrl: string): string {
  if (!imageUrl) return '/placeholder.png';
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/uploads')) return imageUrl; // proxied through Next.js rewrites
  return '/placeholder.png';
}

export default api;

