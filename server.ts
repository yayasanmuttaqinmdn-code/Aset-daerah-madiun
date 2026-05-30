import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Asset } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  const DATA_DIR = path.join(process.cwd(), "data");
  const DATA_FILE = path.join(DATA_DIR, "assets.json");
  const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

  // Ensure data folder exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Load app settings
  let appSettings = { spreadsheetId: "1TABYBj6rdO--FUbHbelQG7SG4j-gttvR25mSpurAU2Y" };
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      appSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      console.log(`Loaded settings: spreadsheetId = ${appSettings.spreadsheetId}`);
    } else {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2), "utf-8");
      console.log("Initialized default app settings file.");
    }
  } catch (err) {
    console.error("Error reading settings file, using default values", err);
  }

  const saveSettings = () => {
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to persist settings file:", err);
    }
  };

  // Load initial assets
  let assetsDb: Asset[] = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      assetsDb = JSON.parse(data);
      console.log(`Loaded ${assetsDb.length} assets from persistent storage.`);
    } else {
      // Default sample assets to make the database look rich immediately on first launch
      const sampleAssets: Asset[] = [
        {
          id: "samp-1",
          type: "tanah",
          jenisSertifikat: "SHM",
          nomerSertifikat: "Madiun/10.05/2021",
          atasNamaSertifikat: "Pemerintah Daerah Madiun",
          lokasi: 'Saradan',
          penggunaan: "Kantor Kecamatan Saradan",
          tempatSimpanBerkas: "Brankas Kantor Bupati Madiun (Lemari A)",
          createdAt: Date.now() - 86400000 * 5
        },
        {
          id: "samp-2",
          type: "kendaraan",
          jenisKendaraan: "MOBIL",
          nomorPolisi: "AE 1045 AP",
          merk: "Toyota Avanza Veloz",
          atasNama: "Dinas Perhubungan Kabupaten Madiun",
          tahunPembuatan: 2021,
          kondisiKendaraan: "BAIK",
          createdAt: Date.now() - 86400000 * 3
        },
        {
          id: "samp-3",
          type: "bangunan",
          namaBangunan: "Gedung Diklat Madiun",
          lokasi: "Taman",
          luasBangunan: 540,
          penggunaanBangunan: "Pendidikan dan Pelatihan Pegawai",
          nomerPBG: "PBG-357701-20230214-01",
          nomerSLF: "SLF-357701-15032023-001",
          kondisi: "BAIK",
          keteranganKerusakan: "-",
          createdAt: Date.now() - 86400000 * 2
        }
      ];
      fs.writeFileSync(DATA_FILE, JSON.stringify(sampleAssets, null, 2), "utf-8");
      assetsDb = sampleAssets;
      console.log("Initialized persistent storage with sample assets.");
    }
  } catch (err) {
    console.error("Error reading data file, using empty memory array", err);
  }

  // Save utility
  const saveAssets = () => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(assetsDb, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to persist data file:", err);
    }
  };

  const sheetName = "Aset_All";
  let lastSheetsError: string | null = null;

  function translateSheetsError(errText: string | null): string | null {
    if (!errText) return null;
    try {
      const parsed = JSON.parse(errText);
      const msg = parsed?.error?.message || "";
      const status = parsed?.error?.status || "";
      const code = parsed?.error?.code;

      if (code === 403 || status === "PERMISSION_DENIED" || msg.toLowerCase().includes("permission")) {
        return "Akses Ditolak (403): Sesi login Anda tidak memiliki izin menulis/mengedit Spreadsheet ini. Silakan pastikan Spreadsheet ini dibagikan dengan hak akses 'Editor' ke akun Google yang Anda hubungkan (yayasanmuttaqinmdn@gmail.com).";
      }
      if (code === 404 || status === "NOT_FOUND" || msg.toLowerCase().includes("not found")) {
        return "Tidak Ditemukan (404): Spreadsheet ID tidak valid atau tidak ditemukan. Silakan periksa kembali Spreadsheet ID di menu pengaturan.";
      }
      if (code === 400 || status === "INVALID_ARGUMENT") {
        return `Format Salah (400): ID Spreadsheet atau range data tidak valid. Hubungi admin. Detail: ${msg}`;
      }
      if (code === 401 || status === "UNAUTHENTICATED") {
        return "Sesi Kedaluwarsa (401): Sesi Google lama tidak valid. Silakan putuskan sambungan (Logout) lalu sambungkan kembali.";
      }
      return `Kesalahan Google Sheets (${code || status || 'Error'}): ${msg || errText}`;
    } catch (e) {
      if (errText.includes("403") || errText.includes("permission") || errText.includes("Permission")) {
        return "Akses Ditolak (403): Silakan pastikan kepemilikian atau hak edit 'Editor' file Google Sheets ini diberikan kepada akun Google Anda.";
      }
      if (errText.includes("404")) {
        return "Tidak Ditemukan (404): Spreadsheet ID tidak valid atau tidak ditemukan.";
      }
      return errText;
    }
  }

  async function ensureSheetTabExists(spreadsheetId: string, accessToken: string) {
    try {
      lastSheetsError = null; // Clear previous error
      const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!getRes.ok) {
        const errText = await getRes.text();
        console.error("Failed to fetch spreadsheet structure:", errText);
        lastSheetsError = errText;
        return false;
      }
      const metadata = (await getRes.json()) as any;
      const sheetExists = metadata.sheets?.some(
        (s: any) => s.properties?.title === sheetName
      );

      if (!sheetExists) {
        console.log(`Sheet "${sheetName}" not found. Creating it...`);
        const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: 9
                    }
                  }
                }
              }
            ]
          })
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          console.error("Failed to create sheet tab:", errText);
          lastSheetsError = errText;
          return false;
        }

        const headers = ["Aset ID", "Kategori", "Identitas Utama", "Keterangan Lokasi/Merk", "Detail Penggunaan/Pemilik", "Tempat Simpan", "Status Peminjaman", "Status Balik Nama", "Raw JSON Data"];
        const putHeaderRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:I1?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ values: [headers] })
        });
        if (!putHeaderRes.ok) {
          const errText = await putHeaderRes.text();
          console.error("Failed to write headers to the new sheet tab:", errText);
          lastSheetsError = errText;
          return false;
        }
        console.log(`Sheet "${sheetName}" created with headers.`);
      }
      return true;
    } catch (err: any) {
      console.error("Error ensuring sheet tab exists:", err);
      lastSheetsError = String(err.message || err);
      return false;
    }
  }

  async function fetchAssetsFromSheets(spreadsheetId: string, accessToken: string): Promise<Asset[] | null> {
    const check = await ensureSheetTabExists(spreadsheetId, accessToken);
    if (!check) return null;

    try {
      lastSheetsError = null;
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:I1000?valueRenderOption=UNFORMATTED_VALUE`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Failed to fetch values from sheet:", errText);
        lastSheetsError = errText;
        return null;
      }
      const data = (await res.json()) as any;
      if (!data.values || data.values.length === 0) {
        return [];
      }

      const loadedAssets: Asset[] = [];
      for (const row of data.values) {
        const rawJson = row[8];
        if (rawJson) {
          try {
            const parsed = JSON.parse(rawJson) as Asset;
            if (parsed && parsed.id) {
              loadedAssets.push(parsed);
            }
          } catch (e) {
            console.warn("Skipping individual row JSON parsing error:", e);
          }
        }
      }
      return loadedAssets;
    } catch (err) {
      console.error("Error fetching assets from Google Sheets:", err);
      return null;
    }
  }

  async function writeAssetsToSheets(spreadsheetId: string, accessToken: string, assets: Asset[]): Promise<boolean> {
    const check = await ensureSheetTabExists(spreadsheetId, accessToken);
    if (!check) return false;

    try {
      lastSheetsError = null;
      const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:I2000:clear`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      if (!clearRes.ok) {
        const errText = await clearRes.text();
        console.error("Failed to clear sheet ranges:", errText);
        lastSheetsError = errText;
        return false;
      }

      if (assets.length === 0) {
        return true;
      }

      const values = assets.map(asset => {
        let identitas = "";
        let detail1 = "";
        let detail2 = "";
        let tempatSimpan = "";
        let statusPinjam = "DIKEMBALIKAN";
        let sedangBalikNama = "TIDAK";

        if (asset.type === "tanah") {
          identitas = `${asset.jenisSertifikat} ${asset.nomerSertifikat}`;
          detail1 = asset.lokasi;
          detail2 = `a.n. ${asset.atasNamaSertifikat || "-"} | Penggunaan: ${asset.penggunaan || "-"}`;
          tempatSimpan = asset.tempatSimpanBerkas || "-";
        } else if (asset.type === "kendaraan") {
          identitas = asset.nomorPolisi;
          detail1 = `${asset.merk} (${asset.tahunPembuatan})`;
          detail2 = `a.n. ${asset.atasNama || "-"}`;
          tempatSimpan = asset.penanggungJawabDaerah || "-";
        } else if (asset.type === "bangunan") {
          identitas = asset.namaBangunan;
          detail1 = asset.lokasi;
          detail2 = `Penggunaan: ${asset.penggunaanBangunan || "-"}`;
          tempatSimpan = `PBG: ${asset.nomerPBG || "-"} | SLF: ${asset.nomerSLF || "-"}`;
        }

        if (asset.sedangDipinjam) {
          statusPinjam = `DIPINJAM oleh ${asset.peminjamanAktif?.peminjamName || 'Seseorang'}`;
        }
        if (asset.sedangBalikNama) {
          sedangBalikNama = "YA";
        }

        return [
          asset.id,
          asset.type,
          identitas,
          detail1,
          detail2,
          tempatSimpan,
          statusPinjam,
          sedangBalikNama,
          JSON.stringify(asset)
        ];
      });

      const putRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:I${assets.length + 1}?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ values })
      });

      if (!putRes.ok) {
        const errText = await putRes.text();
        console.error("Failed to write values to sheet:", errText);
        lastSheetsError = errText;
        return false;
      }
      return true;
    } catch (err: any) {
      console.error("Error writing assets to Google Sheets:", err);
      lastSheetsError = String(err.message || err);
      return false;
    }
  }

  // 1. GET ALL ASSETS
  app.get("/api/assets", async (req, res) => {
    const googleToken = req.headers["x-google-token"] as string | undefined;
    if (googleToken && appSettings.spreadsheetId) {
      console.log("Pulling live assets from Google Sheets...");
      const sheetsAssets = await fetchAssetsFromSheets(appSettings.spreadsheetId, googleToken);
      if (sheetsAssets !== null) {
        if (sheetsAssets.length === 0 && assetsDb.length > 0) {
          console.log("Google Sheets is empty. Initializing with server assets...");
          await writeAssetsToSheets(appSettings.spreadsheetId, googleToken, assetsDb);
        } else {
          // Merge algorithm using Map: keep all sheets assets, plus any local server assets missing in sheets
          const idMap = new Map<string, Asset>();
          sheetsAssets.forEach(a => idMap.set(a.id, a));
          
          let missingInSheets = false;
          assetsDb.forEach(a => {
            if (!idMap.has(a.id)) {
              idMap.set(a.id, a);
              missingInSheets = true;
            }
          });

          assetsDb = Array.from(idMap.values());
          saveAssets();

          if (missingInSheets) {
            console.log("A few server-only assets are missing in Sheets. Resolving conflict by pushing them up...");
            await writeAssetsToSheets(appSettings.spreadsheetId, googleToken, assetsDb);
          }
          console.log(`Assets state successfully integrated sheet data. Global size: ${assetsDb.length}`);
        }
      }
    }
    res.json(assetsDb);
  });

  // 2. BULK SYNC / MERGE
  app.post("/api/assets/sync", async (req, res) => {
    try {
      const clientAssets = req.body.assets as Asset[];
      const googleToken = req.headers["x-google-token"] as string | undefined;

      if (!Array.isArray(clientAssets)) {
        return res.status(400).json({ error: "Invalid payload. 'assets' must be an array." });
      }

      // If user supplies Sheets access token, we can first merge with Sheets to get the shared state
      if (googleToken && appSettings.spreadsheetId) {
        const sheetsAssets = await fetchAssetsFromSheets(appSettings.spreadsheetId, googleToken);
        if (sheetsAssets !== null) {
          if (sheetsAssets.length === 0 && assetsDb.length > 0) {
            console.log("Sheets empty during sync. Backfilling Sheets with server db...");
            await writeAssetsToSheets(appSettings.spreadsheetId, googleToken, assetsDb);
          } else {
            // Merge algorithm using a Map
            const idMap = new Map<string, Asset>();
            sheetsAssets.forEach(a => idMap.set(a.id, a));
            assetsDb.forEach(a => {
              if (!idMap.has(a.id)) {
                idMap.set(a.id, a);
              }
            });
            assetsDb = Array.from(idMap.values());
          }
        }
      }

      const dbIdMap = new Map(assetsDb.map(a => [a.id, a]));
      let mergedCount = 0;

      for (const clientAsset of clientAssets) {
        if (!clientAsset.id) continue;
        if (!dbIdMap.has(clientAsset.id)) {
          assetsDb.push(clientAsset);
          dbIdMap.set(clientAsset.id, clientAsset);
          mergedCount++;
        } else {
          const serverAsset = dbIdMap.get(clientAsset.id)!;
          if (JSON.stringify(serverAsset) !== JSON.stringify(clientAsset)) {
            const index = assetsDb.findIndex(a => a.id === clientAsset.id);
            if (index !== -1) {
              assetsDb[index] = clientAsset;
              dbIdMap.set(clientAsset.id, clientAsset);
              mergedCount++;
            }
          }
        }
      }

      saveAssets();

      if (googleToken && appSettings.spreadsheetId) {
        console.log("Writing synchronized asset database back to Google Sheets...");
        await writeAssetsToSheets(appSettings.spreadsheetId, googleToken, assetsDb);
      }

      res.json({ success: true, count: assetsDb.length, assets: assetsDb });
    } catch (err) {
      console.error("Sync payload error:", err);
      res.status(500).json({ error: "External server error in sync" });
    }
  });

  // 3. CREATE NEW ASSET
  app.post("/api/assets", async (req, res) => {
    try {
      const newAsset = req.body as Asset;
      const googleToken = req.headers["x-google-token"] as string | undefined;

      if (!newAsset || !newAsset.id || !newAsset.type) {
        return res.status(400).json({ error: "Missing asset fields." });
      }

      const index = assetsDb.findIndex(a => a.id === newAsset.id);
      if (index !== -1) {
        assetsDb[index] = newAsset;
      } else {
        assetsDb.push(newAsset);
      }

      saveAssets();

      let syncedWithSheets = false;
      if (googleToken && appSettings.spreadsheetId) {
        syncedWithSheets = await writeAssetsToSheets(appSettings.spreadsheetId, googleToken, assetsDb);
      }

      res.json({ success: true, asset: newAsset, syncedWithSheets });
    } catch (err) {
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  // 4. UPDATE ASSET
  app.put("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updatedAsset = req.body as Asset;
      const googleToken = req.headers["x-google-token"] as string | undefined;

      const index = assetsDb.findIndex(a => a.id === id);
      if (index === -1) {
        assetsDb.push(updatedAsset);
      } else {
        assetsDb[index] = updatedAsset;
      }

      saveAssets();

      let syncedWithSheets = false;
      if (googleToken && appSettings.spreadsheetId) {
        syncedWithSheets = await writeAssetsToSheets(appSettings.spreadsheetId, googleToken, assetsDb);
      }

      res.json({ success: true, asset: updatedAsset, syncedWithSheets });
    } catch (err) {
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  // 5. DELETE ASSET
  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const googleToken = req.headers["x-google-token"] as string | undefined;

      const index = assetsDb.findIndex(a => a.id === id);
      if (index !== -1) {
        assetsDb.splice(index, 1);
        saveAssets();

        let syncedWithSheets = false;
        if (googleToken && appSettings.spreadsheetId) {
          syncedWithSheets = await writeAssetsToSheets(appSettings.spreadsheetId, googleToken, assetsDb);
        }

        res.json({ success: true, id, syncedWithSheets });
      } else {
        res.status(404).json({ error: "Asset not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // 6. CLEAR DATABASE (Helper for migration or master resets)
  app.post("/api/assets/reset", (req, res) => {
    assetsDb = [];
    saveAssets();
    res.json({ success: true, count: 0 });
  });

  // 7. GET SETTINGS
  app.get("/api/settings", (req, res) => {
    res.json(appSettings);
  });

  // GET SHEETS STATUS & ERROR DETAILS
  app.get("/api/sheets/status", async (req, res) => {
    try {
      const googleToken = req.headers["x-google-token"] as string | undefined;
      if (!googleToken) {
        return res.json({ connected: false, error: "Sesi Google belum terhubung. Silakan hubungkan akun Google Anda." });
      }
      if (!appSettings.spreadsheetId) {
        return res.json({ connected: false, error: "ID Spreadsheet belum diatur." });
      }

      const check = await ensureSheetTabExists(appSettings.spreadsheetId, googleToken);
      if (check) {
        return res.json({ connected: true, spreadsheetId: appSettings.spreadsheetId, error: null });
      } else {
        const translated = translateSheetsError(lastSheetsError);
        return res.json({ connected: false, spreadsheetId: appSettings.spreadsheetId, error: translated || "Gagal memverifikasi spreadsheet." });
      }
    } catch (err: any) {
      res.json({ connected: false, error: `Kesalahan server: ${err.message || err}` });
    }
  });

  // 8. UPDATE SETTINGS
  app.post("/api/settings", (req, res) => {
    try {
      const { spreadsheetId } = req.body;
      if (spreadsheetId !== undefined) {
        appSettings.spreadsheetId = String(spreadsheetId).trim();
        saveSettings();
      }
      res.json({ success: true, settings: appSettings });
    } catch (err) {
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Handle Static files & Vite Client
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
