import { bookingHealth, probeBookingHealth } from '../lib/booking-health.ts';
const report = bookingHealth(process.env);
if (process.argv.includes('--probe')) report.probe = await probeBookingHealth(process.env);
console.log(JSON.stringify(report, null, 2));
