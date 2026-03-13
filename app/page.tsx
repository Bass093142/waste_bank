import Link from 'next/link';
import { Leaf, Recycle, TrendingUp, Users } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-6">
            <Leaf className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ธนาคารขยะ
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            ร่วมกันสร้างโลกสวยงาม ด้วยการรีไซเคิลขยะ 
            แลกคะแนน รับของรางวัล และช่วยลดก๊าซเรือนกระจก
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
            >
              สมัครสมาชิก
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-white text-primary border-2 border-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Recycle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">รีไซเคิลขยะ</h3>
            <p className="text-gray-600">
              นำขยะมาแลกคะแนน พลาสติก กระดาษ โลหะ และอื่นๆ
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">สะสมคะแนน</h3>
            <p className="text-gray-600">
              รับคะแนนทุกครั้งที่นำขยะมาฝาก แลกของรางวัลมากมาย
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">ช่วยโลก</h3>
            <p className="text-gray-600">
              ร่วมกันลดก๊าซ CO₂ และรักษาสิ่งแวดล้อม
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-xl text-center shadow">
            <div className="text-3xl font-bold text-primary">1,234</div>
            <div className="text-gray-600 mt-1">สมาชิก</div>
          </div>
          <div className="bg-white p-6 rounded-xl text-center shadow">
            <div className="text-3xl font-bold text-primary">5,678</div>
            <div className="text-gray-600 mt-1">กิโลกรัม</div>
          </div>
          <div className="bg-white p-6 rounded-xl text-center shadow">
            <div className="text-3xl font-bold text-primary">2,340</div>
            <div className="text-gray-600 mt-1">CO₂ ที่ลด (kg)</div>
          </div>
          <div className="bg-white p-6 rounded-xl text-center shadow">
            <div className="text-3xl font-bold text-primary">890</div>
            <div className="text-gray-600 mt-1">ของรางวัล</div>
          </div>
        </div>
      </div>
    </div>
  );
}