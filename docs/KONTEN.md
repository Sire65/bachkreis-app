# Eigene Konten des Bachkreises (Checkliste)

Entscheidung vom 15.10.2026: Der Bachkreis legt **eigene, kostenlose Konten** an. Inhaber sollte möglichst der **Förderverein des Bachkreises Bergkamen e.V.** sein, mit einer neutralen Funktionsadresse, 2-Faktor-Anmeldung und zwei Administratoren.

| Wann | Dienst | Von Hand | GitHub-Secret | Automatisch per CI |
|---|---|---|---|---|
| Start | Mailadresse | anlegen, 2FA | – | – |
| Start | GitHub | Organisation; dieses Repo dorthin übertragen | – | Tests, Pages |
| Start | Supabase | Projekt in Frankfurt, Access Token | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, DB-Passwort | Migration, Edge Functions, Cron, VAPID |
| Start | Brevo | Absender bestätigen, API-Key | `BREVO_API_KEY` | – |
| Phase 2 | Cloudflare | **ein** API-Token (R2) | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Bucket für Noten/Fotos |
| Phase 2 | Neon | API-Key | `NEON_API_KEY` | Spiegel-Projekt |
| Phase 2 | Backblaze B2 | Application Key | `B2_KEY_ID`, `B2_APP_KEY` | Backup-Bucket |

Die Free-Limits beim Anlegen prüfen (Zero-Cost-Gate). Für Supabase muss ein Keep-alive eingeplant werden, weil es Projekte bei Inaktivität pausiert.

**Vor dem Echtbetrieb:**
- Auftragsverarbeitungsverträge mit den Diensten abschließen
- Datenschutzbeauftragten der Schule einbeziehen
- Datenschutzhinweise für Eltern erstellen
