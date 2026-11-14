import { copyFile } from 'node:fs/promises';
await copyFile('backend/generated/index.html', 'backend/Booking.html');
