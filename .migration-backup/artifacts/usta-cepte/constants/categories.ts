export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const CATEGORIES: Category[] = [
  { id: "elektrik", name: "Elektrik", icon: "zap", color: "#F5A623", bgColor: "#2A1F0A" },
  { id: "su-tesisati", name: "Su Tesisatı", icon: "droplet", color: "#0A84FF", bgColor: "#0A1A2A" },
  { id: "klima", name: "Klima", icon: "wind", color: "#00C9A7", bgColor: "#0A2520" },
  { id: "klima-ariza-bakim", name: "Klima Arıza ve Bakım", icon: "wind", color: "#64D2FF", bgColor: "#0A202A" },
  { id: "anahtar", name: "Anahtar", icon: "key", color: "#FF9500", bgColor: "#2A1A00" },
  { id: "boya", name: "Boya ve Badana Hizmetleri", icon: "edit-3", color: "#BF5AF2", bgColor: "#1E0A2A" },
  { id: "dekoratif-siva", name: "Dekoratif Sıva Hizmetleri", icon: "layers", color: "#D19A66", bgColor: "#261A10" },
  { id: "duvar-kagidi", name: "Duvar Kağıdı Hizmetleri", icon: "image", color: "#AF52DE", bgColor: "#210F2A" },
  { id: "isi-yalitimi", name: "Isı Yalıtımı", icon: "thermometer", color: "#FF6B35", bgColor: "#2A140B" },
  { id: "seramik", name: "Seramik", icon: "grid", color: "#FF453A", bgColor: "#2A0A0A" },
  { id: "cilingir", name: "Çilingir", icon: "lock", color: "#34C759", bgColor: "#0A2015" },
  { id: "kaynak", name: "Kaynak İşleri", icon: "tool", color: "#FF9F0A", bgColor: "#2A1800" },
  { id: "sap-beton", name: "Şap ve Saha Beton Hizmetleri", icon: "layers", color: "#A28465", bgColor: "#21180F" },
  { id: "mobilya-montaj-tamir", name: "Mobilya Montaj ve Tamir Hizmetleri", icon: "tool", color: "#C08457", bgColor: "#24160E" },
  { id: "cati", name: "Çatı İşleri", icon: "home", color: "#AC8E68", bgColor: "#21180F" },
  { id: "sundurma", name: "Sundurma İşleri", icon: "umbrella", color: "#64D2FF", bgColor: "#0A202A" },
  { id: "hali-yikama", name: "Halı Yıkama Hizmetleri", icon: "droplet", color: "#30D158", bgColor: "#0A2412" },
  { id: "koltuk-yikama", name: "Koltuk Yıkama", icon: "home", color: "#5E5CE6", bgColor: "#15132A" },
  { id: "alcipan", name: "Alçı ve Alçıpan Hizmetleri", icon: "layers", color: "#B78B5A", bgColor: "#241B12" },
  { id: "sove", name: "Söve Uygulama", icon: "home", color: "#D29B62", bgColor: "#261B11" },
  { id: "diger", name: "Diğer", icon: "more-horizontal", color: "#8E8E93", bgColor: "#1C1C1E" },
];
