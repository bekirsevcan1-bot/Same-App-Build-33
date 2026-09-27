export interface Street {
  name: string;
}

export interface Neighborhood {
  id: string;
  name: string;
  streets: string[];
}

export interface District {
  id: string;
  name: string;
  neighborhoods: Neighborhood[];
}

export const ANTALYA_DISTRICTS: District[] = [
  {
    id: "muratpasa",
    name: "Muratpaşa",
    neighborhoods: [
      {
        id: "guzeloba",
        name: "Güzeloba",
        streets: ["Güzeloba Caddesi", "Lara Caddesi", "Rauf Denktaş Caddesi"],
      },
      {
        id: "kaleici",
        name: "Kaleiçi",
        streets: ["Atatürk Cad.", "Cumhuriyet Cad.", "Hesapçı Sok.", "Uzun Çarşı Cad.", "Kılınçaslan Mah. Sok."],
      },
      {
        id: "sirinyali",
        name: "Şirinyalı",
        streets: ["Şirinyalı Cad.", "Talatpaşa Bulv.", "Metin Kasapoğlu Cad.", "Atatürk Bulv."],
      },
      {
        id: "kiziltoprak",
        name: "Kızıltoprak",
        streets: ["Kızıltoprak Cad.", "Fevzi Çakmak Cad.", "Gazi Bulv.", "İnönü Cad."],
      },
      {
        id: "ozgurluk",
        name: "Özgürlük",
        streets: ["Özgürlük Cad.", "Bayındır Sok.", "Kurtuluş Cad.", "Demokrasi Bulv."],
      },
      {
        id: "bahcelievler",
        name: "Bahçelievler",
        streets: ["Bahçelievler Cad.", "Gül Sok.", "Lale Cad.", "Papatya Sok.", "Sümbül Cad."],
      },
      {
        id: "yenigol",
        name: "Yenigöl",
        streets: ["Yenigöl Cad.", "Çınar Sok.", "Meşe Cad.", "Kavak Sok."],
      },
      {
        id: "hasimiscan",
        name: "Haşimişcan",
        streets: ["Haşimişcan Bulv.", "Şükrü Saraçoğlu Cad.", "İlhan Aras Sok."],
      },
      {
        id: "caglayan",
        name: "Çağlayan",
        streets: ["Çağlayan Cad.", "Yeşilırmak Sok.", "Kızılırmak Cad.", "Fırat Sok."],
      },
      {
        id: "guvercin",
        name: "Güvercin",
        streets: ["Güvercin Cad.", "Akdeniz Bulv.", "Konyaaltı Cad."],
      },
      {
        id: "balbey",
        name: "Balbey",
        streets: ["Balbey Cad.", "Tarihi Çeşme Sok.", "Selçuk Cad."],
      },
    ],
  },
  {
    id: "kepez",
    name: "Kepez",
    neighborhoods: [
      {
        id: "varsak",
        name: "Varsak",
        streets: ["Varsak Bulv.", "Batıkent Cad.", "Barış Cad.", "Emek Sok.", "Sanayi Cad."],
      },
      {
        id: "yesilbahce",
        name: "Yeşilbahçe",
        streets: ["Yeşilbahçe Cad.", "Çiçek Sok.", "Palmiye Cad.", "Çam Sok."],
      },
      {
        id: "pinarbasi",
        name: "Pınarbaşı",
        streets: ["Pınarbaşı Cad.", "Dere Sok.", "Kaynak Cad.", "Su Pınarı Sok."],
      },
      {
        id: "gursu",
        name: "Gürsu",
        streets: ["Gürsu Bulv.", "Hürriyet Cad.", "Cumhuriyet Sok.", "İsmet İnönü Cad."],
      },
      {
        id: "kepez-merkez",
        name: "Kepez Merkez",
        streets: ["Kepez Bulv.", "Santral Sok.", "Enerji Cad.", "Güç Sok."],
      },
      {
        id: "altinova",
        name: "Altınova",
        streets: ["Altınova Cad.", "Altın Sok.", "Çelik Cad.", "Demir Sok."],
      },
      {
        id: "yildirim",
        name: "Yıldırım",
        streets: ["Yıldırım Cad.", "Şimşek Sok.", "Gök Gürültüsü Cad."],
      },
    ],
  },
  {
    id: "konyaalti",
    name: "Konyaaltı",
    neighborhoods: [
      {
        id: "sarisu",
        name: "Sarısu",
        streets: ["Sarısu Cad.", "Plaj Sok.", "Deniz Cad.", "Kumsal Cad."],
      },
      {
        id: "hurma",
        name: "Hurma",
        streets: ["Hurma Bulv.", "Palmiye Cad.", "Zeytinlik Sok.", "Bağlar Cad."],
      },
      {
        id: "liman",
        name: "Liman",
        streets: ["Liman Cad.", "İskele Sok.", "Rıhtım Cad.", "Denizcilik Bulv."],
      },
      {
        id: "uncali",
        name: "Uncalı",
        streets: ["Uncalı Cad.", "Göl Sok.", "Orman Cad.", "Doğa Sok."],
      },
      {
        id: "cakırlar",
        name: "Çakırlar",
        streets: ["Çakırlar Köy Yolu", "Bağcılar Cad.", "Bahçe Sok."],
      },
      {
        id: "gocerler",
        name: "Göçerler",
        streets: ["Göçerler Cad.", "Koşuyolu Sok.", "Vadi Cad."],
      },
    ],
  },
  {
    id: "dosemealti",
    name: "Döşemealtı",
    neighborhoods: [
      {
        id: "aksu-mah",
        name: "Aksu Mah.",
        streets: ["Aksu Cad.", "Pınar Sok.", "Dere Cad."],
      },
      {
        id: "cicekli",
        name: "Çiçekli",
        streets: ["Çiçekli Cad.", "Gül Bahçesi Sok.", "Bahçe Cad."],
      },
      {
        id: "kinik",
        name: "Kınık",
        streets: ["Kınık Cad.", "Köy Sok.", "Orta Cad."],
      },
    ],
  },
  {
    id: "aksu",
    name: "Aksu",
    neighborhoods: [
      {
        id: "altintas",
        name: "Altıntaş",
        streets: ["Altıntaş Bulv.", "Liman Yolu", "Serbest Bölge Cad."],
      },
      {
        id: "kemer-mah",
        name: "Kemer Mah.",
        streets: ["Kemer Cad.", "Düden Sok.", "Şelale Cad."],
      },
      {
        id: "konakli",
        name: "Konaklı",
        streets: ["Konaklı Cad.", "Turizm Cad.", "Sahil Yolu"],
      },
    ],
  },
  {
    id: "alanya",
    name: "Alanya",
    neighborhoods: [
      {
        id: "merkez-alanya",
        name: "Merkez",
        streets: ["Atatürk Cad.", "Güllerpınarı Cad.", "İskele Cad.", "Damlataş Cad."],
      },
      {
        id: "kestel",
        name: "Kestel",
        streets: ["Kestel Cad.", "Plaj Yolu", "Sahil Cad."],
      },
      {
        id: "mahmutlar",
        name: "Mahmutlar",
        streets: ["Mahmutlar Bulv.", "Sahil Sok.", "Deniz Cad.", "Narenciye Sok."],
      },
      {
        id: "avsallar",
        name: "Avsallar",
        streets: ["Avsallar Cad.", "İncekum Yolu", "Plaj Cad."],
      },
      {
        id: "tosmur",
        name: "Tosmur",
        streets: ["Tosmur Cad.", "Dim Çayı Yolu", "Yeşilöz Sok."],
      },
    ],
  },
  {
    id: "manavgat",
    name: "Manavgat",
    neighborhoods: [
      {
        id: "merkez-manavgat",
        name: "Merkez",
        streets: ["Atatürk Cad.", "Manavgat Çayı Kenarı", "Pazar Cad.", "İnönü Cad."],
      },
      {
        id: "side",
        name: "Side",
        streets: ["Side Cad.", "Tapınak Sok.", "Antik Yol", "Sahil Yolu"],
      },
      {
        id: "sorgun",
        name: "Sorgun",
        streets: ["Sorgun Cad.", "Orman Yolu", "Plaj Sok."],
      },
    ],
  },
  {
    id: "serik",
    name: "Serik",
    neighborhoods: [
      {
        id: "merkez-serik",
        name: "Merkez",
        streets: ["Serik Bulv.", "Pazar Cad.", "Cumhuriyet Cad."],
      },
      {
        id: "belek",
        name: "Belek",
        streets: ["Belek Cad.", "Golf Bulv.", "Turizm Yolu"],
      },
    ],
  },
  {
    id: "kemer",
    name: "Kemer",
    neighborhoods: [
      {
        id: "merkez-kemer",
        name: "Merkez",
        streets: ["Atatürk Bulv.", "Liman Cad.", "Yat Limanı Yolu"],
      },
      {
        id: "beldibi",
        name: "Beldibi",
        streets: ["Beldibi Cad.", "Sahil Yolu", "Orman Sok."],
      },
      {
        id: "tekirova",
        name: "Tekirova",
        streets: ["Tekirova Cad.", "Phaselis Yolu", "Sahil Cad."],
      },
    ],
  },
  {
    id: "kas",
    name: "Kaş",
    neighborhoods: [
      {
        id: "merkez-kas",
        name: "Merkez",
        streets: ["Atatürk Bulv.", "Çukurbağ Yarımadası", "Hükümet Cad.", "Elmalt Sok."],
      },
      {
        id: "kalkan",
        name: "Kalkan",
        streets: ["Kalkan Cad.", "Çıkış Yolu", "Sahil Cad."],
      },
    ],
  },
  {
    id: "kumluca",
    name: "Kumluca",
    neighborhoods: [
      {
        id: "merkez-kumluca",
        name: "Merkez",
        streets: ["Kumluca Bulv.", "Pazar Cad.", "Atatürk Cad."],
      },
      {
        id: "finike-yolu",
        name: "Finike Yolu Mah.",
        streets: ["Finike Cad.", "Sera Yolu", "Çiftlik Sok."],
      },
    ],
  },
  {
    id: "elmalı",
    name: "Elmalı",
    neighborhoods: [
      {
        id: "merkez-elmali",
        name: "Merkez",
        streets: ["Elmalı Cad.", "Çarşı Sok.", "Atatürk Cad.", "Cumhuriyet Cad."],
      },
    ],
  },
  {
    id: "korkuteli",
    name: "Korkuteli",
    neighborhoods: [
      {
        id: "merkez-korkuteli",
        name: "Merkez",
        streets: ["Korkuteli Bulv.", "Pınar Cad.", "Dağ Sok.", "Çınar Cad."],
      },
    ],
  },
  {
    id: "finike",
    name: "Finike",
    neighborhoods: [
      {
        id: "merkez-finike",
        name: "Merkez",
        streets: ["Finike Bulv.", "Sahil Cad.", "Liman Cad.", "Portakal Sok."],
      },
    ],
  },
  {
    id: "gazipaşa",
    name: "Gazipaşa",
    neighborhoods: [
      {
        id: "merkez-gazipasa",
        name: "Merkez",
        streets: ["Gazipaşa Bulv.", "İstasyon Cad.", "Sahil Yolu"],
      },
    ],
  },
  {
    id: "demre",
    name: "Demre",
    neighborhoods: [
      {
        id: "merkez-demre",
        name: "Merkez",
        streets: ["Demre Bulv.", "Myra Yolu", "Noel Baba Cad.", "Liman Cad."],
      },
    ],
  },
  {
    id: "akseki",
    name: "Akseki",
    neighborhoods: [
      {
        id: "merkez-akseki",
        name: "Merkez",
        streets: ["Akseki Cad.", "Dağ Yolu", "Orman Sok.", "Çay Cad."],
      },
    ],
  },
  {
    id: "ibradı",
    name: "İbradı",
    neighborhoods: [
      {
        id: "merkez-ibradi",
        name: "Merkez",
        streets: ["İbradı Cad.", "Köy Yolu", "Yayla Sok."],
      },
    ],
  },
  {
    id: "gündoğmuş",
    name: "Gündoğmuş",
    neighborhoods: [
      {
        id: "merkez-gundogmus",
        name: "Merkez",
        streets: ["Gündoğmuş Cad.", "Dağ Sok.", "Orman Yolu"],
      },
    ],
  },
];
