import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, ChevronLeft, Mail, Phone, ShieldCheck, Stethoscope, Save, Loader2, Send } from 'lucide-react';

interface AddDoctorProps {
  onBack: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function AddDoctor({ onBack, onSuccess, onError }: AddDoctorProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialty: '',
    str_number: '',
    sip_number: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.email || !formData.full_name) {
      onError('Nama dan email wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { aexonConnect } = await import('../lib/aexonConnect');
      const { data, error } = await aexonConnect.inviteEnterpriseDoctor({
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        specialty: formData.specialty.trim() || undefined,
        str_number: formData.str_number.trim() || undefined,
        sip_number: formData.sip_number.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });

      if (error) {
        onError(error);
        return;
      }

      onSuccess(data?.message || 'Dokter berhasil ditambahkan.');
      onBack();
    } catch (err) {
      onError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const FONT = "'Plus Jakarta Sans', sans-serif";

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', fontSize: 14, fontWeight: 600,
    color: '#0C1E35', backgroundColor: '#FFFFFF',
    border: '1.5px solid #E2E8F0', borderRadius: 12,
    outline: 'none', fontFamily: FONT,
    transition: 'border-color 150ms, box-shadow 150ms',
    boxSizing: 'border-box',
  };

  const inputIconStyle: React.CSSProperties = {
    ...inputStyle,
    paddingLeft: 44,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#94A3B8', marginBottom: 6, fontFamily: FONT,
    textTransform: 'uppercase', letterSpacing: '0.03em',
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    border: '1px solid #E2E8F0', overflow: 'hidden',
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: '18px 24px',
    background: 'linear-gradient(135deg, #0C1E35, #152d4f)',
    display: 'flex', alignItems: 'center', gap: 10,
  };

  const sectionBodyStyle: React.CSSProperties = {
    padding: '28px 24px',
  };

  return (
    <div
      className="custom-scrollbar"
      style={{
        flex: 1, overflowY: 'auto', height: '100%',
        backgroundColor: '#F8FAFC', fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 32px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button
            onClick={onBack}
            disabled={isSubmitting}
            style={{
              width: 40, height: 40, borderRadius: 12, border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 150ms', flexShrink: 0,
            }}
          >
            <ChevronLeft style={{ width: 18, height: 18, color: '#64748B' }} />
          </button>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0C1E35', margin: 0, letterSpacing: '-0.02em' }}>
              Undang Dokter Baru
            </h2>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '4px 0 0', fontWeight: 500 }}>
              Email undangan akan dikirim otomatis ke dokter.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Section: Informasi Pribadi */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <UserPlus style={{ width: 16, height: 16, color: '#ffffff' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Informasi Pribadi</span>
            </div>
            <div style={sectionBodyStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Nama Lengkap & Gelar *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    style={inputStyle}
                    placeholder="Dr. Budi Santoso, Sp.PD"
                    onFocus={e => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Spesialisasi</label>
                  <input
                    type="text"
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    style={inputStyle}
                    placeholder="Gastroenterohepatologi"
                    onFocus={e => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94A3B8' }} />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      style={inputIconStyle}
                      placeholder="dokter@rsup.co.id"
                      onFocus={e => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Nomor Telepon</label>
                  <div style={{ position: 'relative' }}>
                    <Phone style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94A3B8' }} />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      style={inputIconStyle}
                      placeholder="0812..."
                      onFocus={e => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Kredensial Medis */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <ShieldCheck style={{ width: 16, height: 16, color: '#ffffff' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Kredensial Medis</span>
            </div>
            <div style={sectionBodyStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Nomor STR</label>
                  <input
                    type="text"
                    value={formData.str_number}
                    onChange={e => setFormData({ ...formData, str_number: e.target.value })}
                    style={inputStyle}
                    placeholder="16 Digit Nomor STR"
                    onFocus={e => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Nomor SIP</label>
                  <input
                    type="text"
                    value={formData.sip_number}
                    onChange={e => setFormData({ ...formData, sip_number: e.target.value })}
                    style={inputStyle}
                    placeholder="SIP/XXXX/XXX/XXXX"
                    onFocus={e => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              style={{
                padding: '12px 28px', fontSize: 14, fontWeight: 700,
                color: '#64748B', backgroundColor: '#F1F5F9',
                border: 'none', borderRadius: 12, cursor: 'pointer',
                fontFamily: FONT, transition: 'all 150ms',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', fontSize: 14, fontWeight: 700,
                color: '#ffffff',
                background: isSubmitting ? '#94A3B8' : 'linear-gradient(135deg, #0C1E35, #152d4f)',
                border: 'none', borderRadius: 12, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontFamily: FONT, transition: 'all 150ms',
                boxShadow: isSubmitting ? 'none' : '0 4px 20px rgba(12,30,53,0.25)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  Mengirim Undangan...
                </>
              ) : (
                <>
                  <Send style={{ width: 16, height: 16 }} />
                  Undang Dokter
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
