import sharp from 'sharp';

// Screenshot desktop (1280x720) - fundo azul com texto
const desktopSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <rect width="1280" height="720" fill="#1e3a5f"/>
  <rect x="0" y="0" width="240" height="720" fill="#172d4a"/>
  <rect x="240" y="0" width="1040" height="60" fill="#2563eb"/>
  <text x="660" y="40" font-family="Arial" font-size="22" fill="white" text-anchor="middle" font-weight="bold">Smart Express - Sistema ERP</text>
  <text x="120" y="80" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Menu</text>
  <rect x="20" y="100" width="200" height="36" rx="6" fill="#1e3a5f"/>
  <text x="120" y="124" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Dashboard</text>
  <rect x="20" y="144" width="200" height="36" rx="6" fill="#1e3a5f"/>
  <text x="120" y="168" font-family="Arial" font-size="14" fill="white" text-anchor="middle">PDV</text>
  <rect x="20" y="188" width="200" height="36" rx="6" fill="#1e3a5f"/>
  <text x="120" y="212" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Ordens de Servico</text>
  <rect x="20" y="232" width="200" height="36" rx="6" fill="#1e3a5f"/>
  <text x="120" y="256" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Produtos</text>
  <rect x="280" y="90" width="480" height="280" rx="12" fill="#1e293b"/>
  <text x="520" y="130" font-family="Arial" font-size="18" fill="white" text-anchor="middle" font-weight="bold">Vendas do Mes</text>
  <rect x="780" y="90" width="460" height="280" rx="12" fill="#1e293b"/>
  <text x="1010" y="130" font-family="Arial" font-size="18" fill="white" text-anchor="middle" font-weight="bold">Faturamento</text>
  <rect x="280" y="400" width="960" height="280" rx="12" fill="#1e293b"/>
  <text x="760" y="440" font-family="Arial" font-size="18" fill="white" text-anchor="middle" font-weight="bold">Ultimas Transacoes</text>
</svg>`;

// Screenshot mobile (750x1334)
const mobileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1334">
  <rect width="750" height="1334" fill="#1e3a5f"/>
  <rect x="0" y="0" width="750" height="60" fill="#2563eb"/>
  <text x="375" y="40" font-family="Arial" font-size="24" fill="white" text-anchor="middle" font-weight="bold">Smart Express</text>
  <rect x="20" y="80" width="710" height="200" rx="12" fill="#1e293b"/>
  <text x="375" y="140" font-family="Arial" font-size="22" fill="white" text-anchor="middle" font-weight="bold">Dashboard</text>
  <text x="375" y="180" font-family="Arial" font-size="16" fill="#94a3b8" text-anchor="middle">Resumo do dia</text>
  <rect x="20" y="300" width="345" height="160" rx="12" fill="#1e293b"/>
  <text x="192" y="390" font-family="Arial" font-size="18" fill="white" text-anchor="middle">Vendas</text>
  <rect x="385" y="300" width="345" height="160" rx="12" fill="#1e293b"/>
  <text x="557" y="390" font-family="Arial" font-size="18" fill="white" text-anchor="middle">OS</text>
  <rect x="20" y="480" width="710" height="300" rx="12" fill="#1e293b"/>
  <text x="375" y="530" font-family="Arial" font-size="20" fill="white" text-anchor="middle" font-weight="bold">Ultimas Vendas</text>
  <rect x="20" y="800" width="710" height="300" rx="12" fill="#1e293b"/>
  <text x="375" y="850" font-family="Arial" font-size="20" fill="white" text-anchor="middle" font-weight="bold">Servicos em Andamento</text>
</svg>`;

await sharp(Buffer.from(desktopSvg)).png().toFile('public/screenshot-desktop.png');
console.log('screenshot-desktop.png gerado (1280x720)');

await sharp(Buffer.from(mobileSvg)).png().toFile('public/screenshot-mobile.png');
console.log('screenshot-mobile.png gerado (750x1334)');

console.log('Screenshots gerados!');
