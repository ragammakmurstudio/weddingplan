import type { WeddingState } from "./types";

export function defaultWeddingState(): WeddingState {
  return {
    dataVersion: 3,
    weddingDate: "2027-06-20",
    akadTime: "08:00 WIB",
    resepsiTime: "11:00 - 14:00 WIB",
    weddingVenue: "Grand Ballroom Hotel Santika, Jakarta",
    weddingTheme: "Modern Nusantara Elegant (Rose Gold & Gold)",
    totalBudget: 0,
    brideData: {
      cpp: {
        fullName: "",
        nickname: "",
        father: "",
        mother: "",
        phone: "",
        address: "",
      },
      cpw: {
        fullName: "",
        nickname: "",
        father: "",
        mother: "",
        phone: "",
        address: "",
      },
    },
    budgetList: [],
    maharItems: [
      { id: "seed-mahar-1", title: "Logam Mulia Antam 10 Gram", cost: 13500000, ready: false },
      { id: "seed-mahar-2", title: "Set Perhiasan Emas 5 Gram", cost: 6500000, ready: false },
      { id: "seed-mahar-3", title: "Seperangkat Alat Sholat Premium", cost: 1500000, ready: false },
    ],
    seserahanCppToCpw: [
      { id: "seed-se-cpp1", title: "Set Skincare & Cosmetic", cost: 2500000, ready: false },
      { id: "seed-se-cpp2", title: "Tas & Sepatu Pesta CPW", cost: 3500000, ready: false },
      { id: "seed-se-cpp3", title: "Kain Kebaya & Bahan Pakaian", cost: 2000000, ready: false },
    ],
    seserahanCpwToCpp: [
      { id: "seed-se-cpw1", title: "Set Jas Formal & Sepatu Pria", cost: 3000000, ready: false },
      { id: "seed-se-cpw2", title: "Parfum & Grooming Kit", cost: 1500000, ready: false },
    ],
    vendors: [],
    adminDocs: [
      {
        id: "seed-doc-1",
        title: "Surat Pengantar Nikah dari RT / RW",
        description: "Meminta pengantar awal dari RT dan RW setempat",
        completed: false,
      },
      {
        id: "seed-doc-2",
        title: "Surat Pengantar Kelurahan (Form N1 - N4)",
        description: "Diurus di kantor kelurahan domisili masing-masing",
        completed: false,
      },
      {
        id: "seed-doc-3",
        title: "Fotokopi KTP, KK, & Akta Kelahiran CPP & CPW",
        description: "Rangkap 3 berkas fotokopi clear",
        completed: false,
      },
      {
        id: "seed-doc-4",
        title: "Pasfoto Background Biru 2x3 (4 lembar) & 3x4 (2 lembar)",
        description: "Pakaian rapi berkerah",
        completed: false,
      },
      {
        id: "seed-doc-5",
        title: "Surat Rekomendasi Nikah (Numpang Nikah KUA)",
        description: "Diperlukan jika lokasi akad beda kecamatan",
        completed: false,
      },
      {
        id: "seed-doc-6",
        title: "Sertifikat / Surat Kesehatan dari Puskesmas (Suntik TT)",
        description: "Pemeriksaan kesehatan calon pengantin",
        completed: false,
      },
    ],
    guests: [],
    checklist: [
      { id: "seed-cl-1", timeframe: "H-12 s/d H-9 Bulan", task: "Menentukan Budget Pernikahan & Konsep Utama", done: false },
      { id: "seed-cl-2", timeframe: "H-12 s/d H-9 Bulan", task: "Booking Tanggal & Venue / Gedung Pernikahan", done: false },
      { id: "seed-cl-3", timeframe: "H-8 s/d H-6 Bulan", task: "Booking Catering", done: false },
      { id: "seed-cl-4", timeframe: "H-8 s/d H-6 Bulan", task: "Booking MUA (Makeup Artist)", done: false },
      { id: "seed-cl-5", timeframe: "H-8 s/d H-6 Bulan", task: "Booking Busana Pengantin", done: false },
      { id: "seed-cl-6", timeframe: "H-8 s/d H-6 Bulan", task: "Booking Dekorasi", done: false },
      { id: "seed-cl-7", timeframe: "H-5 s/d H-3 Bulan", task: "Mengurus Pendaftaran Berkas Administrasi KUA", done: false },
      { id: "seed-cl-8", timeframe: "H-5 s/d H-3 Bulan", task: "Beli / Pesan Mahar & Hantaran Seserahan", done: false },
      { id: "seed-cl-9", timeframe: "H-2 s/d H-1 Bulan", task: "Cetak & Distribusi Undangan", done: false },
      { id: "seed-cl-10", timeframe: "H-2 s/d H-1 Bulan", task: "Buat / Pesan Souvenir", done: false },
      { id: "seed-cl-11", timeframe: "H-2 s/d H-1 Bulan", task: "Fitting Akhir Baju Pengantin & Technical Meeting Vendor", done: false },
      { id: "seed-cl-12", timeframe: "H-1 Minggu s/d H-1 Hari", task: "Gladi Bersih, Perawatan Diri, & Istirahat Cukup", done: false },
    ],
    rundownList: [
      { id: "seed-rd-1", time: "07:30 WIB", activity: "Persiapan Mempelai & MUA Makeup", pic: "MUA & WO" },
      { id: "seed-rd-2", time: "08:30 WIB", activity: "Prosesi Akad Nikah & Ijab Kabul", pic: "Penghulu KUA" },
      { id: "seed-rd-3", time: "11:00 WIB", activity: "Pembukaan Resepsi & Foto Bersama", pic: "MC Resepsi" },
    ],
    committeeList: [
      { id: "seed-cm-1", role: "Saksi Nikah CPP", name: "Bpk. Drs. Soeparno", uniformGiven: false },
      { id: "seed-cm-2", role: "Penerima Tamu 1", name: "Siti & Maya", uniformGiven: false },
      { id: "seed-cm-3", role: "Penerima Tamu 2", name: "Dian & Rina", uniformGiven: false },
      { id: "seed-cm-4", role: "PIC Konsumsi / Catering", name: "Paman Budi", uniformGiven: false },
    ],
  };
}
