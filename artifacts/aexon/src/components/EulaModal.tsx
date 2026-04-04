import React, { useState, useRef, useCallback } from 'react';

interface EulaModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

const eulaText = `PERJANJIAN LISENSI PENGGUNA AKHIR (EULA)

Versi 1.0 | PT. Aexon Inovasi Teknologi | Terakhir diperbarui: Januari 2025

Dengan menggunakan aplikasi Aexon ("Aplikasi"), Anda ("Pengguna") menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan yang tercantum dalam Perjanjian Lisensi Pengguna Akhir ("EULA") ini. Apabila Pengguna tidak menyetujui ketentuan ini, Pengguna tidak diperkenankan untuk mengakses atau menggunakan Aplikasi.

1. PENGGUNAAN APLIKASI. Aplikasi ini dirancang dan dikembangkan secara eksklusif untuk keperluan dokumentasi prosedur endoskopi oleh tenaga medis profesional yang memiliki Surat Tanda Registrasi (STR) dan Surat Izin Praktik (SIP) yang masih berlaku sesuai dengan ketentuan peraturan perundang-undangan yang berlaku di wilayah Negara Kesatuan Republik Indonesia. Penggunaan Aplikasi di luar keperluan medis profesional sebagaimana dimaksud di atas adalah dilarang dan merupakan pelanggaran terhadap ketentuan EULA ini. Pengguna bertanggung jawab penuh atas segala penggunaan Aplikasi yang dilakukan dengan menggunakan akun Pengguna. PT. Aexon Inovasi Teknologi tidak bertanggung jawab atas penyalahgunaan Aplikasi oleh pihak yang tidak berwenang yang mengakses akun Pengguna akibat kelalaian Pengguna dalam menjaga kerahasiaan kredensial akun.

2. KERAHASIAAN DATA PASIEN. Seluruh data pasien yang diinput, didokumentasikan, dan/atau disimpan melalui Aplikasi ini tersimpan secara lokal pada perangkat Pengguna dan dienkripsi menggunakan kunci yang diturunkan dari identitas akun Pengguna. PT. Aexon Inovasi Teknologi tidak menyimpan, mengakses, mentransmisikan, atau memproses data pasien pada server milik PT. Aexon Inovasi Teknologi atau server pihak ketiga manapun tanpa persetujuan eksplisit tertulis dari Pengguna. Pengguna bertanggung jawab sepenuhnya atas keamanan fisik perangkat yang digunakan untuk menjalankan Aplikasi, termasuk namun tidak terbatas pada pengamanan terhadap akses tidak sah, pencurian perangkat, kerusakan perangkat, dan kehilangan data akibat kegagalan perangkat keras atau perangkat lunak. Pengguna wajib melakukan backup data secara berkala sesuai dengan kebijakan internal institusi kesehatan tempat Pengguna berpraktik. PT. Aexon Inovasi Teknologi tidak bertanggung jawab atas kehilangan data yang disebabkan oleh kegagalan Pengguna dalam melakukan backup data.

3. LISENSI PENGGUNAAN. PT. Aexon Inovasi Teknologi memberikan kepada Pengguna lisensi terbatas, non-eksklusif, tidak dapat dipindahtangankan, dan dapat dicabut sewaktu-waktu untuk menggunakan Aplikasi sesuai dengan ketentuan EULA ini dan ketentuan paket berlangganan yang dipilih oleh Pengguna. Satu lisensi berlaku untuk satu orang Pengguna (satu dokter). Pengguna tidak diperkenankan untuk membagikan, menjual kembali, menyewakan, atau mengalihkan hak penggunaan lisensi kepada pihak ketiga manapun. Pelanggaran terhadap ketentuan lisensi ini akan mengakibatkan pencabutan lisensi secara otomatis tanpa pemberitahuan terlebih dahulu dan tanpa kewajiban pengembalian biaya berlangganan yang telah dibayarkan.

4. BATASAN TANGGUNG JAWAB. DALAM HAL APAPUN, PT. AEXON INOVASI TEKNOLOGI, TERMASUK DIREKSI, KOMISARIS, KARYAWAN, AGEN, DAN AFILIASI TIDAK BERTANGGUNG JAWAB ATAS KERUGIAN LANGSUNG, TIDAK LANGSUNG, INSIDENTAL, KHUSUS, KONSEKUENSIAL, ATAU KERUGIAN DALAM BENTUK APAPUN YANG TIMBUL DARI ATAU TERKAIT DENGAN PENGGUNAAN ATAU KETIDAKMAMPUAN MENGGUNAKAN APLIKASI, TERMASUK NAMUN TIDAK TERBATAS PADA KERUGIAN YANG TIMBUL DARI KEPUTUSAN MEDIS YANG DIAMBIL BERDASARKAN DOKUMENTASI YANG DIBUAT MELALUI APLIKASI INI. Aplikasi ini merupakan alat bantu dokumentasi dan bukan merupakan alat diagnostik. Segala keputusan klinis dan diagnostik tetap merupakan tanggung jawab profesional Pengguna selaku tenaga medis yang berpraktik sesuai dengan standar kompetensi dan kode etik profesi yang berlaku. Total tanggung jawab PT. Aexon Inovasi Teknologi atas seluruh klaim yang timbul dari atau terkait dengan EULA ini tidak akan melebihi jumlah total biaya berlangganan yang telah dibayarkan oleh Pengguna dalam periode dua belas (12) bulan terakhir sebelum klaim tersebut diajukan.

5. KEPATUHAN REGULASI. Pengguna wajib memastikan bahwa penggunaan Aplikasi sesuai dengan seluruh peraturan perundang-undangan yang berlaku, termasuk namun tidak terbatas pada: (a) Undang-Undang Nomor 17 Tahun 2023 tentang Kesehatan beserta peraturan pelaksananya; (b) Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi beserta peraturan pelaksananya; (c) Peraturan Menteri Kesehatan yang berlaku mengenai rekam medis elektronik; (d) Standar dan pedoman yang ditetapkan oleh organisasi profesi terkait. Pengguna bertanggung jawab atas kepatuhan terhadap regulasi yang berlaku di yurisdiksi tempat Pengguna berpraktik.

6. HAK KEKAYAAN INTELEKTUAL. Seluruh hak kekayaan intelektual atas Aplikasi, termasuk namun tidak terbatas pada kode sumber, desain antarmuka, algoritma, dokumentasi, merek dagang "Aexon", logo, dan seluruh konten yang terkandung dalam Aplikasi merupakan milik eksklusif PT. Aexon Inovasi Teknologi dan dilindungi oleh undang-undang hak cipta, merek dagang, dan hak kekayaan intelektual lainnya yang berlaku di wilayah Negara Kesatuan Republik Indonesia dan perjanjian internasional yang berlaku. Pengguna tidak memperoleh hak kepemilikan apapun atas Aplikasi selain hak penggunaan terbatas yang secara tegas diberikan berdasarkan EULA ini. Pengguna dilarang untuk melakukan reverse engineering, dekompilasi, disassembly, atau upaya lainnya untuk memperoleh kode sumber Aplikasi.

7. PENYELESAIAN SENGKETA. Setiap sengketa yang timbul dari atau terkait dengan EULA ini akan diselesaikan secara musyawarah mufakat terlebih dahulu dalam jangka waktu tiga puluh (30) hari kalender sejak pemberitahuan sengketa diterima oleh salah satu pihak. Apabila penyelesaian secara musyawarah mufakat tidak tercapai dalam jangka waktu tersebut, maka sengketa akan diselesaikan melalui Badan Arbitrase Nasional Indonesia (BANI) yang berkedudukan di Jakarta sesuai dengan peraturan dan prosedur BANI yang berlaku pada saat sengketa diajukan. Putusan arbitrase bersifat final dan mengikat kedua belah pihak. EULA ini tunduk pada dan ditafsirkan sesuai dengan hukum Negara Kesatuan Republik Indonesia.

8. PERUBAHAN EULA. PT. Aexon Inovasi Teknologi berhak untuk mengubah, memodifikasi, atau memperbarui ketentuan EULA ini sewaktu-waktu tanpa pemberitahuan terlebih dahulu. Perubahan akan berlaku efektif sejak tanggal publikasi versi terbaru EULA. Penggunaan Aplikasi secara berkelanjutan setelah perubahan EULA dianggap sebagai persetujuan Pengguna terhadap perubahan tersebut. Pengguna disarankan untuk meninjau EULA secara berkala untuk mengetahui perubahan terbaru.

Dengan mengklik tombol "Setuju & Lanjutkan" di bawah ini, Pengguna menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan yang tercantum dalam Perjanjian Lisensi Pengguna Akhir ini.`;

export default function EulaModal({ onAccept, onDecline }: EulaModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [declined, setDeclined] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 30) {
        setHasScrolledToBottom(true);
      }
    }
  }, []);

  const handleAccept = () => {
    onAccept();
  };

  const handleDecline = () => {
    setDeclined(true);
    onDecline();
  };

  if (declined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8 font-mono">
        <div className="text-center max-w-md">
          <p className="text-xs text-gray-600">Tutup aplikasi untuk keluar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-2xl border border-gray-300" style={{ borderRadius: 0 }}>
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-300">
          <p className="text-sm font-bold text-gray-800 font-mono">
            PERJANJIAN LISENSI PENGGUNA AKHIR (EULA)
          </p>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Versi 1.0 | PT. Aexon Inovasi Teknologi | Terakhir diperbarui: Januari 2025
          </p>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto px-6 py-4"
          style={{ maxHeight: '60vh', minHeight: '400px' }}
        >
          <p className="text-xs text-gray-600 font-mono leading-tight whitespace-pre-wrap" style={{ lineHeight: '1.4' }}>
            {eulaText}
          </p>
        </div>

        <div className="px-6 py-3 border-t border-gray-300 bg-white">
          <p className="text-xs text-gray-400 font-mono text-center mb-3">
            Anda harus membaca seluruh perjanjian sebelum melanjutkan.
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleAccept}
              disabled={!hasScrolledToBottom}
              className={`w-full py-3 text-xs font-bold font-mono uppercase tracking-wide transition-colors ${
                hasScrolledToBottom
                  ? 'bg-gray-800 text-white hover:bg-gray-900'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              style={{ borderRadius: 0 }}
            >
              Setuju & Lanjutkan
            </button>
            <button
              onClick={handleDecline}
              className="w-full py-2 text-xs text-gray-400 font-mono hover:text-gray-600 transition-colors"
            >
              Tidak Setuju
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
