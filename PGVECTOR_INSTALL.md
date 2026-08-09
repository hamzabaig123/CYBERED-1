# Installing pgvector on PostgreSQL 17 (Windows)

## Option 1: Download Pre-built Binary (RECOMMENDED - 5 minutes)

1. Download pgvector for PostgreSQL 17 from:
   https://github.com/pgvector/pgvector/releases

2. Look for the Windows binary: `pgvector-v0.8.0-windows-x64-pg17.zip`

3. Extract the ZIP file

4. Copy the files to your PostgreSQL installation:
   - Copy `vector.dll` to: `C:\Program Files\PostgreSQL\17\lib\`
   - Copy `vector.control` and `vector--*.sql` to: `C:\Program Files\PostgreSQL\17\share\extension\`

5. Run the migration script again:
   ```powershell
   $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cybered"
   tsx scripts/apply-pgvector-migration.ts
   ```

## Option 2: Use Docker PostgreSQL with pgvector (ALTERNATIVE)

If you want to avoid manual installation, you can use Docker:

```powershell
# Stop current PostgreSQL
# Run PostgreSQL with pgvector
docker run -d \
  --name cybered-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cybered \
  -p 5432:5432 \
  pgvector/pgvector:pg17

# Update DATABASE_URL to point to localhost:5432
```

## Option 3: Build from Source (ADVANCED - 30 minutes)

Requires Visual Studio Build Tools and PostgreSQL development files.
Follow: https://github.com/pgvector/pgvector#windows

---

## After Installation

Once pgvector is installed, run:

```powershell
cd d:\CYBERED\CYBERED
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cybered"
tsx scripts/apply-pgvector-migration.ts
```

This will create the `textbook_chunks` table with vector embeddings support.
