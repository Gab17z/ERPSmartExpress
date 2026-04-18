import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const svgBuffer = readFileSync('public/pwa-512x512.svg');

// Gerar PNG 512x512
await sharp(svgBuffer).resize(512, 512).png().toFile('public/pwa-512x512.png');
console.log('pwa-512x512.png gerado');

// Gerar PNG 192x192
await sharp(svgBuffer).resize(192, 192).png().toFile('public/pwa-192x192.png');
console.log('pwa-192x192.png gerado');

// Gerar Apple Touch Icon 180x180
await sharp(svgBuffer).resize(180, 180).png().toFile('public/apple-touch-icon-180x180.png');
console.log('apple-touch-icon-180x180.png gerado');

// Gerar favicon 64x64
await sharp(svgBuffer).resize(64, 64).png().toFile('public/favicon-64x64.png');
console.log('favicon-64x64.png gerado');

console.log('Todos os ícones gerados!');
