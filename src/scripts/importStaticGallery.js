require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const galleryDataPath = path.join(__dirname, '..', '..', 'data', 'galleryData.json');
  const galleryData = JSON.parse(fs.readFileSync(galleryDataPath, 'utf8'));

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let imported = 0;
  let skipped = 0;

  for (const yearBlock of galleryData) {
    for (const festival of yearBlock.festivals) {
      const albumResult = await client.query(
        `SELECT id FROM gallery_albums WHERE year = $1 AND slug = $2`,
        [yearBlock.year, festival.slug]
      );

      if (albumResult.rows.length === 0) {
        console.log(`Skipping ${yearBlock.year}/${festival.slug} — album not in database`);
        continue;
      }

      const albumId = albumResult.rows[0].id;

      for (const imageName of festival.images) {
        const sourceUrl = `/gallery/${yearBlock.year}/${festival.slug}/${imageName}`;

        const exists = await client.query(
          `SELECT id FROM gallery_images WHERE album_id = $1 AND source_url = $2`,
          [albumId, sourceUrl]
        );

        if (exists.rows.length > 0) {
          skipped += 1;
          continue;
        }

        await client.query(
          `INSERT INTO gallery_images (album_id, filename, source_url, caption, is_active)
           VALUES ($1, $2, $3, $4, TRUE)`,
          [albumId, imageName, sourceUrl, festival.name]
        );
        imported += 1;
      }
    }
  }

  await client.end();
  console.log(`Static gallery import complete. Imported: ${imported}, skipped: ${skipped}`);
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
