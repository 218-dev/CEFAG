import React, { useEffect, useState } from 'react';
import { Contract } from '../types';

interface InvoiceModalProps {
  contract: Contract;
  onClose: () => void;
}

type PrintMode = 'none' | 'contract';

const InvoiceModal: React.FC<InvoiceModalProps> = ({ contract, onClose }) => {
  const EMPTY = '▍▍▍▍▍▍▍▍▍▍▍'
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const [hasPrinted, setHasPrinted] = useState(false)
  const [licenseNumber, setLicenseNumber] = useState<string>('LIC-9821-LY')
  const [showLicense, setShowLicense] = useState<boolean>(true)
  const [officeTitle, setOfficeTitle] = useState<string>('محرر عقود')

  const handlePrintInvoice = () => {
    setHasPrinted(false)
    setPrintMode('contract');
    try { document.body.setAttribute('data-print','contract') } catch {}
  };

  const handleBack = () => {
      setPrintMode('none');
      setHasPrinted(false)
      try { document.body.removeAttribute('data-print') } catch {}
  }

  useEffect(() => {
    const after = () => {
      setPrintMode('none')
      setHasPrinted(true)
      try { document.body.removeAttribute('data-print') } catch {}
    }
    window.addEventListener('afterprint', after)
    return () => window.removeEventListener('afterprint', after)
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/system_settings')
        if (res.ok) {
          const arr = await res.json()
          const s = Array.isArray(arr) && arr.length ? arr[0] : null
          if (s) {
            if (typeof s.licenseNumber === 'string') setLicenseNumber(s.licenseNumber)
            if (typeof s.showLicenseNumber === 'boolean') setShowLicense(s.showLicenseNumber)
            if (typeof s.officeTitle === 'string') setOfficeTitle(s.officeTitle)
          }
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (printMode === 'contract' && !hasPrinted) {
      const t = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(t)
    }
  }, [printMode, hasPrinted])

  return (
  <div className="fixed inset-0 bg-slate-900/95 flex justify-center items-center z-50 p-0 sm:p-4 backdrop-blur-md print:p-0 print:bg-white print:block print:relative overflow-y-auto" id="invoice-modal">
      
      {/* Success Screen UI (Visible only when printMode is 'none') */}
      <div className={`bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all p-8 text-center space-y-6 print:hidden ${printMode !== 'none' ? 'hidden' : 'block'}`}>
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <i className="bi bi-check-lg text-5xl text-emerald-600"></i>
          </div>
          
          <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">تم حفظ العقد بنجاح</h2>
              <p className="text-slate-500 text-sm px-6">تمت عملية الأرشفة بنجاح وحفظ البيانات في قاعدة البيانات المحلية.</p>
              <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100 inline-block min-w-[200px]">
                  <p className="text-slate-900 font-bold text-lg">{contract.title}</p>
                  <p className="text-xs text-slate-500 font-mono">REF: {contract.id}</p>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-4">
              <button 
                onClick={handlePrintInvoice}
                className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-3 group"
              >
                  <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                     <i className="bi bi-receipt-cutoff text-xl text-amber-500"></i>
                  </span>
                  <span>طباعة العقد</span>
              </button>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm mt-6 flex items-center justify-center gap-2 mx-auto transition-colors"
          >
              <i className="bi bi-arrow-right"></i>
              العودة لقائمة العقود
          </button>
      </div>


      {/* Printable Container (This is what gets printed) */}
      <style>{`@page{size:A4;margin:8mm}@media print{body{background:white!important}body *{visibility:hidden}#contract-print,#contract-print *{visibility:visible!important}#contract-print{position:absolute;left:0;top:0;width:100%!important;background:white!important;display:block!important}}`}</style>
      <div id="contract-print" className={`bg-white rounded-none shadow-none w-full mx-auto ${printMode === 'none' ? 'hidden' : 'block'} print:block`} style={{ width: '210mm' }}>
            
            {/* CONTRACT DOCUMENT */}
            <div className={`p-8 print:p-[8mm] relative z-10 flex flex-col justify-between min-h-[297mm] ${printMode === 'contract' ? 'block' : 'hidden'} print:block`}>
                <div>
                    {/* Header */}
                    <div className="text-center border-b-2 border-slate-900 pb-4 mb-6 print:border-black">
                    <div className="flex justify-between items-start">
                             {showLicense && (
                               <div className="text-right w-32 pt-2">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 print:text-gray-700">رقم الترخيص</p>
                                  <p className="font-mono font-bold text-slate-900 text-xs print:text-black">{licenseNumber}</p>
                               </div>
                             )}
                             <div className="flex-1">
                                <h1 className="text-4xl font-bold mb-1 font-reem-ink text-slate-900 print:text-black">{officeTitle}</h1>
                                <h2 className="text-5xl font-bold mb-4 font-reem-ink text-amber-600 print:text-black">فتحي عبد الجواد</h2>
                                <div className="inline-flex gap-8 text-sm font-bold text-slate-600 print:text-black border-t border-b border-slate-300 print:border-black py-2 px-8 mt-2">
                                    <span>توثيق عقود</span>
                                    <span>•</span>
                                    <span>استشارات قانونية</span>
                                    <span>•</span>
                                    <span>أرشفة إلكترونية</span>
                                </div>
                             </div>
                             <div className="text-left w-32 pt-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 print:text-gray-700">التاريخ</p>
                                <p className="font-mono font-bold text-slate-900 text-xs print:text-black">{new Date().toLocaleDateString('en-GB')}</p>
                             </div>
                             <div className="text-left w-32 pt-2 flex flex-col items-center gap-1">
                                <img src={`${location.origin}/api/verify-qr/${contract.id}`} alt="QR" className="w-20 h-20 border-2 border-slate-300 rounded print:border-black" />
                                <span className="text-[10px] font-bold text-slate-600 print:text-gray-700">امسح للتحقق من صحة العقد</span>
                             </div>
                        </div>
                    </div>

                    {/* Meta Info Row */}
                    <div className="flex justify-between items-end mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100 print:bg-transparent print:p-0 print:border-0">
                        <div>
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-0 font-bold print:text-gray-700">رقم المرجع (Reference)</p>
                            <p className="font-bold text-2xl font-mono text-slate-900 print:text-black">#{contract.id}</p>
                        </div>
                        <div className="text-left">
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-0 font-bold print:text-gray-700">تاريخ تحرير العقد</p>
                            <p className="font-bold text-lg font-mono text-slate-900 print:text-black">{new Date(contract.creationDate).toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>

                    {/* Main Details */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 print:border-black print:rounded-none">
                        <div className="bg-slate-900 text-white p-2 print:bg-black print:text-white">
                             <h3 className="font-bold text-sm flex items-center gap-2 justify-center">
                                وثيقة عقد
                             </h3>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-8 text-sm print:bg-white">
                            <div className="col-span-2 pb-3 border-b border-dashed border-slate-200 print:border-gray-400">
                                <span className="block text-slate-500 text-xs font-bold uppercase mb-2 print:text-gray-700">عنوان وموضوع العقد</span>
                                <span className="font-bold text-2xl text-slate-900 leading-relaxed print:text-black">{contract.title}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs font-bold uppercase mb-1 print:text-gray-700">نوع العقد</span>
                                <span className="font-bold text-lg text-slate-900 print:text-black">{contract.type}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs font-bold uppercase mb-1 print:text-gray-700">بداية العقد</span>
                                <span className="font-mono font-bold text-slate-900 print:text-black">{(contract.startDate || contract.creationDate) ? new Date(contract.startDate || contract.creationDate).toLocaleDateString('en-GB') : '------'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 text-xs font-bold uppercase mb-1 print:text-gray-700">نهاية العقد</span>
                                <span className="font-mono font-bold text-slate-900 print:text-black">{contract.endDate ? new Date(contract.endDate).toLocaleDateString('en-GB') : '------'}</span>
                            </div>
                        </div>
                        <div className="mx-4 mb-4 p-2 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-sm font-bold flex items-center gap-2 print:bg-transparent print:text-black print:border-rose-400">
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            تحذير: أي شطب أو تعديل باليد يلغي هذه الوثيقة
                        </div>
                    </div>

                    {/* Parties */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 print:bg-white print:border print:border-black print:p-4">
                            <h4 className="font-bold border-b-2 border-slate-200 mb-3 pb-1 text-slate-800 text-sm uppercase print:text-black print:border-black">الطرف الأول</h4>
                            <div className="space-y-0.5 text-sm">
                                <div className="flex items-center gap-2"><span className="text-slate-500 print:text-gray-700">الاسم:</span><span className="font-bold text-slate-900 print:text-black">{contract.party1.name}</span></div>
                                <div className="flex items-center gap-2"><span className="text-slate-500 print:text-gray-700">نوع الهوية:</span><span className="font-bold text-slate-900 print:text-black">{contract.party1.idType}</span></div>
                                <div className="flex items-center gap-2"><span className="text-slate-500 print:text-gray-700">رقم الهوية:</span><span className="font-mono font-bold text-slate-900 print:text-black">{contract.party1.idNumber}</span></div>
                            </div>
                        </div>
                        {contract.party2 ? (
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 print:bg-white print:border print:border-black print:p-4">
                                <h4 className="font-bold border-b-2 border-slate-200 mb-3 pb-1 text-slate-800 text-sm uppercase print:text-black print:border-black">الطرف الثاني</h4>
                                <div className="space-y-0.5 text-sm">
                                    <div className="flex items-center gap-2"><span className="text-slate-500 print:text-gray-700">الاسم:</span><span className="font-bold text-slate-900 print:text-black">{contract.party2.name}</span></div>
                                    <div className="flex items-center gap-2"><span className="text-slate-500 print:text-gray-700">نوع الهوية:</span><span className="font-bold text-slate-900 print:text-black">{contract.party2.idType}</span></div>
                                    <div className="flex items-center gap-2"><span className="text-slate-500 print:text-gray-700">رقم الهوية:</span><span className="font-mono font-bold text-slate-900 print:text-black">{contract.party2.idNumber}</span></div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 print:bg-white print:border print:border-black print:p-4 flex items-center justify-center">
                                <span className="text-slate-400 text-xs font-bold uppercase print:text-gray-600">لا يوجد طرف ثاني</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes */}
                {contract.notes && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 print:border-black print:rounded-none">
                        <div className="bg-slate-100 p-2 print:bg-gray-200">
                            <h4 className="font-bold text-sm text-slate-800 text-center print:text-black">الملاحظات</h4>
                        </div>
                        <div className="p-4 text-slate-700 text-sm print:text-black print:bg-white">
                            {contract.notes}
                        </div>
                    </div>
                )}

                {/* Footer: signatures and fingerprint */}
                <div className="mt-6 pt-6 border-t-2 border-slate-900 print:border-black">
                    <div className={`grid ${contract.party2 ? 'grid-cols-3' : 'grid-cols-2'} gap-6 items-end`}>
                        <div className="text-center">
                            <p className="font-bold mb-4 text-slate-500 text-xs uppercase tracking-widest print:text-gray-700">توقيع الطرف الأول</p>
                            <div className="h-20 border-b border-dashed border-slate-400 mb-2 w-5/6 mx-auto print:border-black"></div>
                        </div>
                        {contract.party2 && (
                            <div className="text-center">
                                <p className="font-bold mb-4 text-slate-500 text-xs uppercase tracking-widest print:text-gray-700">توقيع الطرف الثاني</p>
                                <div className="h-20 border-b border-dashed border-slate-400 mb-2 w-5/6 mx-auto print:border-black"></div>
                            </div>
                        )}
                        <div className="text-center">
                            <p className="font-bold mb-4 text-slate-500 text-xs uppercase tracking-widest print:text-gray-700">الختم وتوقيع المكتب</p>
                            <div className="flex items-center justify-center gap-6 mb-2">
                                <div className="w-28 h-28 border-4 border-slate-300 border-double rounded-full print:border-black"></div>
                                <div className="h-20 border-b border-dashed border-slate-400 w-40 print:border-black"></div>
                            </div>
                            <div className="text-slate-700 font-bold text-xs print:text-black">{officeTitle}</div>
                        </div>
                    </div>
                    {contract.requireFingerprint && (
                        <div className="mt-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="text-center">
                                    <p className="font-bold mb-2 text-slate-500 text-xs uppercase tracking-widest print:text-gray-700">بصمة الطرف الأول</p>
                                    <div className="w-32 h-32 border-2 border-slate-300 rounded-md mx-auto print:border-black"></div>
                                </div>
                                {contract.party2 && (
                                    <div className="text-center">
                                        <p className="font-bold mb-2 text-slate-500 text-xs uppercase tracking-widest print:text-gray-700">بصمة الطرف الثاني</p>
                                        <div className="w-32 h-32 border-2 border-slate-300 rounded-md mx-auto print:border-black"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="text-center mt-4 text-[10px] text-slate-400 font-mono print:text-black print:mt-2">
                    <p className="m-0">تم إصدار هذا المستند إلكترونياً من منظومة الأرشفة الإلكترونية.</p>
                    <p className="m-0" dir="ltr">System ID: {contract.id}</p>
                    <p className="m-0">حقوق المطور تنفيذ وبرمجة 3bdo 092-8102731</p>
                </div>
            </div>
            
            

             {/* Back Button (Visible when viewing the printable version on screen) */}
             <div className="fixed top-6 left-6 print:hidden z-50">
                <button 
                    onClick={handleBack} 
                    className="bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-slate-700 transition-all flex items-center gap-2 font-bold"
                >
                    <i className="bi bi-arrow-right"></i>
                    <span>العودة</span>
                </button>
             </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
