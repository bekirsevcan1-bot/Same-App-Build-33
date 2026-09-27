---
name: Supabase URL format
description: Supabase browser bağlantısı için proje URL'si ham https URL olmalı; Markdown bağlantısı veya etiketli değer DNS/URL hatasına yol açar.
---

Supabase proje URL'si ortam değişkenine yalnızca `https://<project-ref>.supabase.co` biçiminde yazılmalı; köşeli parantez, parantez, açıklama veya `KEY=` etiketi değer parçası olmamalıdır.

**Why:** Markdown biçiminde kaydedilen bir URL tarayıcıda `Failed to fetch`, sunucuda ise DNS `ENOTFOUND` hatasına dönüştü; genel internet bağlantısı çalışırken yalnızca Supabase hostu çözülemedi.

**How to apply:** Supabase Dashboard → Project Settings → API içindeki Project URL ve publishable anon key değerlerini ham olarak kullan; URL'yi `getaddrinfo`/HTTP ile doğrulamadan giriş akışını test sonucu kabul etme.