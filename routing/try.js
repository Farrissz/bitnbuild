// Quick check from the terminal:  node try.js "Kollam Junction" "Technopark, Thiruvananthapuram"
require('dotenv').config();
const { planRoutes } = require('./routes');

const [, , origin = 'Kollam Junction, Kollam', dest = 'Technopark, Thiruvananthapuram'] = process.argv;

planRoutes(origin, dest)
  .then(({ routes, warnings }) => {
    warnings.forEach((w) => console.warn('!', w));
    for (const r of routes) {
      const tag = r.synced ? '  [SYNCED]' : '';
      console.log(`\n${r.mode.toUpperCase()}${tag}  ${r.summary}  (${r.source})`);
      console.log(`  ${r.durationText} | leave ${r.departureText} (in ${r.leaveInMin} min) | arrive ${r.arrivalText}`);
      if (r.syncInfo) console.log(`  ${r.syncInfo}`);
      if (r.mode === 'driving') console.log(`  ${r.steps.length} driving steps`);
      else r.steps.forEach((s) => console.log(`   - ${s.instruction} (${s.durationText})`));
    }
  })
  .catch((e) => { console.error(e); process.exit(1); });
