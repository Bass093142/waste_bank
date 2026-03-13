// Mock Data สำหรับระบบธนาคารขยะ

export interface User {
  id: string;
  prefix: string;
  firstName: string;
  lastName: string;
  email: string;
  points: number;
  co2Reduced: number;
  isBanned: boolean;
  joinedDate: string;
}

export interface WasteType {
  id: string;
  name: string;
  description: string;
  pointsPerKg: number;
  co2PerKg: number;
  image: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  wasteTypeId: string;
  wasteTypeName: string;
  weight: number;
  points: number;
  co2Reduced: number;
  date: string;
  price: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  stock: number;
  image: string;
}

export interface RedeemHistory {
  id: string;
  userId: string;
  userName: string;
  rewardId: string;
  rewardName: string;
  pointsUsed: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface Settings {
  openTime: string;
  closeTime: string;
  workingDays: string[];
}

// Mock Users
export const mockUsers: User[] = Array.from({ length: 45 }, (_, i) => ({
  id: `user-${i + 1}`,
  prefix: ['นาย', 'นาง', 'นางสาว'][i % 3],
  firstName: [
    'สมชาย', 'สมหญิง', 'วิชัย', 'ประภา', 'นิรันดร์', 'สุดา', 'อนุชา', 'พิมพ์', 
    'กานต์', 'ธนพล', 'วรรณา', 'ชัยวัฒน์', 'มาลี', 'ธีระ', 'นวพร'
  ][i % 15],
  lastName: [
    'ใจดี', 'รักษ์โลก', 'สีเขียว', 'ทิพย์สุดา', 'อนุรักษ์', 'ปลูกต้นไม้', 'ช่วยโลก',
    'สะอาด', 'เรียบร้อย', 'มีสติ', 'รักษาสิ่งแวดล้อม', 'ดีเลิศ', 'สมบูรณ์'
  ][i % 13],
  email: `user${i + 1}@example.com`,
  points: Math.floor(Math.random() * 5000) + 100,
  co2Reduced: Math.floor(Math.random() * 500) + 10,
  isBanned: i % 20 === 0,
  joinedDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
}));

// Mock Waste Types
export const mockWasteTypes: WasteType[] = [
  {
    id: 'waste-1',
    name: 'ขยะพลาสติก',
    description: 'ขวดน้ำพลาสติก ถุงพลาสติก ภาชนะพลาสติกต่างๆ',
    pointsPerKg: 10,
    co2PerKg: 2.5,
    image: '🔵',
  },
  {
    id: 'waste-2',
    name: 'กระดาษ',
    description: 'กระดาษทุกชนิด หนังสือพิมพ์ กล่องกระดาษ',
    pointsPerKg: 5,
    co2PerKg: 1.8,
    image: '📄',
  },
  {
    id: 'waste-3',
    name: 'โลหะ',
    description: 'กระป๋องอลูมิเนียม เหล็ก ทองแดง',
    pointsPerKg: 15,
    co2PerKg: 3.2,
    image: '⚙️',
  },
  {
    id: 'waste-4',
    name: 'แก้ว',
    description: 'ขวดแก้ว ภาชนะแก้วต่างๆ',
    pointsPerKg: 8,
    co2PerKg: 2.0,
    image: '🍾',
  },
  {
    id: 'waste-5',
    name: 'อิเล็กทรอนิกส์',
    description: 'อุปกรณ์ไฟฟ้าเก่า โทรศัพท์เก่า',
    pointsPerKg: 25,
    co2PerKg: 5.0,
    image: '📱',
  },
];

// Mock Transactions
export const mockTransactions: Transaction[] = Array.from({ length: 100 }, (_, i) => {
  const user = mockUsers[i % mockUsers.length];
  const waste = mockWasteTypes[i % mockWasteTypes.length];
  const weight = Math.random() * 10 + 1;
  const points = Math.floor(weight * waste.pointsPerKg);
  const co2 = parseFloat((weight * waste.co2PerKg).toFixed(2));
  
  return {
    id: `trans-${i + 1}`,
    userId: user.id,
    userName: `${user.prefix}${user.firstName} ${user.lastName}`,
    wasteTypeId: waste.id,
    wasteTypeName: waste.name,
    weight: parseFloat(weight.toFixed(2)),
    points,
    co2Reduced: co2,
    date: new Date(2026, 2, Math.floor(Math.random() * 12) + 1).toISOString(),
    price: Math.floor(weight * 15) + 10,
  };
});

// Mock Rewards
export const mockRewards: Reward[] = [
  {
    id: 'reward-1',
    name: 'ถุงผ้าลดโลกร้อน',
    description: 'ถุงผ้าสำหรับช้อปปิ้ง ลดการใช้ถุงพลาสติก',
    pointsRequired: 100,
    stock: 50,
    image: '👜',
  },
  {
    id: 'reward-2',
    name: 'กระบอกน้ำสแตนเลส',
    description: 'กระบอกน้ำเก็บความเย็น-ร้อน',
    pointsRequired: 500,
    stock: 30,
    image: '🍶',
  },
  {
    id: 'reward-3',
    name: 'ต้นไม้ในกระถาง',
    description: 'ต้นไม้เพื่อปลูกในบ้าน ช่วยลดมลพิษ',
    pointsRequired: 200,
    stock: 25,
    image: '🌱',
  },
  {
    id: 'reward-4',
    name: 'คูปองส่วนลด 7-11',
    description: 'คูปองส่วนลด 50 บาท',
    pointsRequired: 300,
    stock: 100,
    image: '🎫',
  },
  {
    id: 'reward-5',
    name: 'แก้วกาแฟรีไซเคิล',
    description: 'แก้วกาแฟทำจากวัสดุรีไซเคิล',
    pointsRequired: 250,
    stock: 40,
    image: '☕',
  },
  {
    id: 'reward-6',
    name: 'หลอดสแตนเลส',
    description: 'ชุดหลอดสแตนเลสพร้อมแปรง',
    pointsRequired: 150,
    stock: 60,
    image: '🥤',
  },
];

// Mock Redeem History
export const mockRedeemHistory: RedeemHistory[] = Array.from({ length: 80 }, (_, i) => {
  const user = mockUsers[i % mockUsers.length];
  const reward = mockRewards[i % mockRewards.length];
  
  return {
    id: `redeem-${i + 1}`,
    userId: user.id,
    userName: `${user.prefix}${user.firstName} ${user.lastName}`,
    rewardId: reward.id,
    rewardName: reward.name,
    pointsUsed: reward.pointsRequired,
    date: new Date(2026, 2, Math.floor(Math.random() * 12) + 1).toISOString(),
    status: ['completed', 'pending', 'cancelled'][i % 10 === 0 ? 2 : i % 5 === 0 ? 1 : 0] as 'pending' | 'completed' | 'cancelled',
  };
});

// Mock Settings
export const mockSettings: Settings = {
  openTime: '08:00',
  closeTime: '17:00',
  workingDays: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
};
