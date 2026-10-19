import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, KeyRound, ChevronRight, School, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Login() {
  const [idCard, setIdCard] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const backendBaseUrl = 'https://teacherhub-backend-324760995892.asia-southeast1.run.app';
  
  // First-time setup & change PIN state
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isMustChange, setIsMustChange] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [firstTimeError, setFirstTimeError] = useState('');
  const [mustChangeError, setMustChangeError] = useState('');
  
  const getErrorMessage = (data: any, fallback: string) => {
    if (typeof data?.detail === 'string') return data.detail;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
      return data.detail.map((d: any) => d.msg).join(', ');
    }
    if (data?.message) return data.message;
    return fallback;
  };
  
  const navigate = useNavigate();

  useEffect(() => {
    const savedId = localStorage.getItem('sgs_saved_idCard');
    // ไม่เก็บ PIN ในเบราว์เซอร์อีกต่อไป — ล้างค่าที่ค้างจากเวอร์ชันเก่า
    localStorage.removeItem('sgs_saved_pin');
    sessionStorage.removeItem('temp_pin');
    if (savedId) {
      setIdCard(savedId);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${backendBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCard, pin })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('sgs_token', data.access_token);
        localStorage.setItem('sgs_user', JSON.stringify(data.teacher));
        
        if (rememberMe) {
          localStorage.setItem('sgs_saved_idCard', idCard);
        } else {
          localStorage.removeItem('sgs_saved_idCard');
          localStorage.removeItem('sgs_saved_pin');
        }
        
        navigate('/hub');
      } else {
        if (data.detail === 'FIRST_TIME_LOGIN') {
          setIsFirstTime(true);
          return;
        }
        if (data.detail === 'MUST_CHANGE_PIN') {
          setCurrentPin(pin);
          setIsMustChange(true);
          return;
        }
        Swal.fire({
          icon: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          text: data.detail || 'เลขประจำตัวประชาชน หรือ PIN ไม่ถูกต้อง',
          confirmButtonColor: '#4f46e5',
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        confirmButtonColor: '#4f46e5',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFirstTimeError('');

    if (newPin !== confirmPin) {
      const msg = 'กรุณายืนยันรหัส PIN ให้ตรงกัน';
      setFirstTimeError(msg);
      Swal.fire({
        icon: 'error',
        title: 'รหัสไม่ตรงกัน',
        text: msg,
        confirmButtonColor: '#4f46e5',
      });
      return;
    }
    
    if (!/^\d{6}$/.test(newPin)) {
      const msg = 'รหัส PIN ใหม่ต้องเป็นตัวเลข 6 หลักเท่านั้น';
      setFirstTimeError(msg);
      Swal.fire({
        icon: 'error',
        title: 'รูปแบบรหัสไม่ถูกต้อง',
        text: msg,
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    if (newPin === '123456') {
      const msg = 'ไม่อนุญาตให้ใช้รหัส 123456 กรุณาตั้งรหัสที่มีความปลอดภัย';
      setFirstTimeError(msg);
      Swal.fire({
        icon: 'error',
        title: 'รหัสไม่ปลอดภัย',
        text: msg,
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    if (idCard.length >= 6 && newPin === idCard.slice(-6)) {
      const msg = 'ไม่อนุญาตให้ใช้เลข 6 ตัวท้ายของบัตรประชาชน';
      setFirstTimeError(msg);
      Swal.fire({
        icon: 'error',
        title: 'รหัสไม่ปลอดภัย',
        text: msg,
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendBaseUrl}/api/auth/first-time-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCard, newPin })
      });
      
      const data = await response.json().catch(() => ({}));
      
      if (response.ok) {
        setFirstTimeError('');
        Swal.fire({
          icon: 'success',
          title: 'ตั้งรหัส PIN สำเร็จ',
          text: 'กรุณาเข้าสู่ระบบด้วยรหัส PIN ใหม่ของคุณ',
          confirmButtonColor: '#4f46e5',
        }).then(() => {
          setIsFirstTime(false);
          setPin('');
          setNewPin('');
          setConfirmPin('');
        });
      } else {
        const errorMsg = getErrorMessage(data, 'ไม่สามารถตั้งรหัสผ่านใหม่ได้ กรุณาติดต่อผู้ดูแลระบบ');
        setFirstTimeError(errorMsg);
        Swal.fire({
          icon: 'error',
          title: 'ตั้งรหัสไม่สำเร็จ',
          text: errorMsg,
          confirmButtonColor: '#4f46e5',
        });
      }
    } catch (err: any) {
      const errorMsg = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ' + (err?.message || 'Network error');
      setFirstTimeError(errorMsg);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        text: errorMsg,
        confirmButtonColor: '#4f46e5',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMustChangeError('');

    if (newPin !== confirmPin) {
      const msg = 'กรุณายืนยันรหัส PIN ให้ตรงกัน';
      setMustChangeError(msg);
      Swal.fire({
        icon: 'error',
        title: 'รหัสไม่ตรงกัน',
        text: msg,
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      const msg = 'รหัส PIN ใหม่ต้องเป็นตัวเลข 6 หลักเท่านั้น';
      setMustChangeError(msg);
      Swal.fire({
        icon: 'error',
        title: 'รูปแบบรหัสไม่ถูกต้อง',
        text: msg,
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    if (newPin === currentPin) {
      const msg = 'รหัส PIN ใหม่ต้องไม่ซ้ำกับรหัสเดิม';
      setMustChangeError(msg);
      Swal.fire({
        icon: 'error',
        title: 'รหัสซ้ำเดิม',
        text: msg,
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    if (newPin === '123456') {
      const msg = 'ไม่อนุญาตให้ใช้รหัส 123456 กรุณาตั้งรหัสที่มีความปลอดภัย';
      setMustChangeError(msg);
      Swal.fire({
        icon: 'error',
        title: 'รหัสไม่ปลอดภัย',
        text: msg,
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    if (idCard.length >= 6 && newPin === idCard.slice(-6)) {
      const msg = 'ไม่อนุญาตให้ใช้เลข 6 ตัวท้ายของบัตรประชาชน';
      setMustChangeError(msg);
      Swal.fire({
        icon: 'error',
        title: 'รหัสไม่ปลอดภัย',
        text: msg,
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendBaseUrl}/api/auth/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCard, currentPin, newPin })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setMustChangeError('');
        Swal.fire({
          icon: 'success',
          title: 'เปลี่ยนรหัส PIN สำเร็จ',
          text: 'กรุณาเข้าสู่ระบบด้วยรหัส PIN ใหม่ของคุณ',
          confirmButtonColor: '#4f46e5',
        }).then(() => {
          setIsMustChange(false);
          setPin('');
          setCurrentPin('');
          setNewPin('');
          setConfirmPin('');
        });
      } else {
        const errorMsg = getErrorMessage(data, 'ไม่สามารถเปลี่ยนรหัส PIN ได้ กรุณาติดต่อผู้ดูแลระบบ');
        setMustChangeError(errorMsg);
        Swal.fire({
          icon: 'error',
          title: 'เปลี่ยนรหัสไม่สำเร็จ',
          text: errorMsg,
          confirmButtonColor: '#4f46e5',
        });
      }
    } catch (err: any) {
      const errorMsg = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ' + (err?.message || 'Network error');
      setMustChangeError(errorMsg);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        text: errorMsg,
        confirmButtonColor: '#4f46e5',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-gradient-to-tr from-indigo-600 to-blue-500 p-4 rounded-2xl shadow-lg transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            <School className="w-12 h-12 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          AssessmentHub
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="idCard" className="block text-sm font-semibold text-slate-700">
                เลขประจำตัวประชาชน
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  id="idCard"
                  name="idCard"
                  type="text"
                  maxLength={13}
                  required
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  className="block w-full pl-11 pr-3 py-3 sm:text-sm border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-slate-50 focus:bg-white"
                  placeholder="xxxxxxxxxxxxx"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pin" className="block text-sm font-semibold text-slate-700">
                รหัสผ่าน (PIN)
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  id="pin"
                  name="pin"
                  type={showPin ? "text" : "password"}
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="block w-full pl-11 pr-10 py-3 sm:text-sm border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-slate-50 focus:bg-white"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded text-indigo-600"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 font-medium">
                  จดจำการเข้าระบบ
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_25px_rgba(79,70,229,0.6)] transform transition-all duration-300 active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span>เข้าสู่ระบบ</span>
                    <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  if (!idCard) {
                    Swal.fire('แจ้งเตือน', 'กรุณากรอกเลขบัตรประชาชนก่อนกดเข้าสู่ระบบครั้งแรก', 'warning');
                    return;
                  }
                  setPin('');
                  // Automatically trigger login with empty pin
                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                  handleLogin(fakeEvent);
                }}
                className="w-full flex justify-center py-3 px-4 border border-indigo-200 text-sm font-bold rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <span>✨ เข้าสู่ระบบครั้งแรก (ตั้งรหัส PIN)</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* First Time Setup Modal */}
      {isFirstTime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">ตั้งรหัส PIN ใหม่</h3>
            <p className="text-sm text-slate-500 mb-6">
              คุณกำลังเข้าสู่ระบบครั้งแรก กรุณาตั้งรหัส PIN ใหม่ 6 หลักเพื่อความปลอดภัย
            </p>
            
            {firstTimeError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5 shadow-sm">
                <span className="text-lg leading-none shrink-0">⚠️</span>
                <div className="flex-1">
                  <div className="font-bold">ตั้งรหัสไม่สำเร็จ</div>
                  <div className="text-xs text-rose-600 mt-0.5 leading-relaxed">{firstTimeError}</div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleFirstTimeSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">รหัส PIN ใหม่ (6 หลัก)</label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    autoComplete="new-password"
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="block w-full pl-11 pr-3 py-3 sm:text-sm border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white"
                    placeholder="••••••"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700">ยืนยันรหัส PIN ใหม่</label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    autoComplete="new-password"
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className="block w-full pl-11 pr-3 py-3 sm:text-sm border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFirstTime(false)}
                  className="flex-1 py-3 px-4 border border-slate-300 text-sm font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 shadow-md transition-colors"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Must Change PIN Modal (for temporary PIN or forced PIN update) */}
      {isMustChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">จำเป็นต้องเปลี่ยนรหัส PIN</h3>
            <p className="text-sm text-slate-500 mb-6">
              คุณเข้าสู่ระบบด้วยรหัส PIN ชั่วคราว หรือรหัสเดิมที่ต้องปรับปรุงความปลอดภัย กรุณาตั้งรหัส PIN ใหม่ (6 หลัก) เพื่อเข้าใช้งาน
            </p>
            
            {mustChangeError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5 shadow-sm">
                <span className="text-lg leading-none shrink-0">⚠️</span>
                <div className="flex-1">
                  <div className="font-bold">เปลี่ยนรหัสไม่สำเร็จ</div>
                  <div className="text-xs text-rose-600 mt-0.5 leading-relaxed">{mustChangeError}</div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleChangePin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">รหัส PIN ปัจจุบัน / รหัสชั่วคราว</label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    className="block w-full pl-11 pr-3 py-3 sm:text-sm border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">รหัส PIN ใหม่ (6 หลัก)</label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    autoComplete="new-password"
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="block w-full pl-11 pr-3 py-3 sm:text-sm border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white"
                    placeholder="••••••"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700">ยืนยันรหัส PIN ใหม่</label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    autoComplete="new-password"
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className="block w-full pl-11 pr-3 py-3 sm:text-sm border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsMustChange(false)}
                  className="flex-1 py-3 px-4 border border-slate-300 text-sm font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 shadow-md transition-colors"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
