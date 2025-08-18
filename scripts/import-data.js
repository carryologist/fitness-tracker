const fs = require('fs');
const path = require('path');

// CSV data from the attachment
const csvData = `Date,Source,Activity,Mins,Miles,Weight
1/3/25,Peloton,Cycling,30,10.3,
1/4/25,Peloton,Cycling,30,10.19,
1/5/25,Cannondale,Cycling,32,5.8,
1/6/25,Cannondale,Cycling,39,8.4,
1/8/25,Peloton,Cycling,20,6.83,
1/9/25,Cannondale,Cycling,38,7.1,
1/10/25,Peloton,Cycling,15,5.06,
1/10/25,Peloton,Cycling,15,5.42,
1/11/25,Peloton,Cycling,30,9.6,
1/12/25,Peloton,Cycling,15,5,
1/12/25,Peloton,Cycling,30,10.01,
1/17/25,Peloton,Cycling,95,31.37,
1/17/25,Peloton,Cycling,62,18.68,
1/18/25,Peloton,Cycling,79,25,
1/18/25,Peloton,Cycling,49,15,
1/18/25,Peloton,Cycling,31,9.9,
1/21/25,Peloton,Cycling,30,9.81,
1/22/25,Peloton,Cycling,30,10.39,
1/24/25,Tonal,Weight Lifting,18,,2302
2/2/25,Peloton,Cycling,30,9.7,
2/2/25,Peloton,Cycling,30,10.9,
2/3/25,Peloton,Cycling,30,10.16,
2/4/25,Peloton,Cycling,30,10.27,
2/4/25,Peloton,Cycling,5,1.46,
2/4/25,Tonal,Weight Lifting,22,,5350
2/6/25,Peloton,Cycling,45,13.47,
2/7/25,Tonal,Weight Lifting,22,,2908
2/7/25,Peloton,Cycling,30,10.19,
2/8/25,Peloton,Cycling,30,10.02,
2/8/25,Peloton,Cycling,15,4.98,
2/8/25,Peloton,Cycling,5,1.51,
2/9/25,Tonal,Weight Lifting,21,,4408
2/9/25,Peloton,Cycling,20,7.61,
2/9/25,Peloton,Cycling,30,9.34,
2/9/25,Peloton,Cycling,10,3.46,
2/10/25,Peloton,Cycling,20,6.76,
2/11/25,Peloton,Cycling,45,15.46,
2/12/25,Peloton,Cycling,30,10.08,
2/12/25,Peloton,Cycling,20,6.68,
2/13/25,Tonal,Weight Lifting,20,,4769
2/13/25,Peloton,Cycling,30,9.96,
2/15/25,Peloton,Cycling,15,4.95,
2/15/25,Peloton,Cycling,15,5.56,
2/15/25,Peloton,Cycling,30,9.89,
2/16/25,Tonal,Weight Lifting,45,,4329
2/16/25,Peloton,Cycling,20,6.53,
2/16/25,Peloton,Cycling,5,1.48,
2/17/25,Tonal,Weight Lifting,38,,10486
2/17/25,Peloton,Cycling,15,4.39,
2/18/25,Peloton,Cycling,45,15,
2/19/25,Tonal,Weight Lifting,44,,8871
2/20/25,Peloton,Cycling,30,9.95,
2/21/25,Tonal,Weight Lifting,44,,5752
2/22/25,Peloton,Cycling,20,6.13,
2/22/25,Peloton,Cycling,45,13.43,
2/23/25,Tonal,Weight Lifting,35,,4167
2/23/25,Peloton,Cycling,20,6.31,
2/24/25,Peloton,Cycling,20,6.78,
2/24/25,Peloton,Cycling,20,6.5,
2/24/25,Peloton,Cycling,10,2.88,
2/25/25,Tonal,Weight Lifting,41,,9196
2/27/25,Tonal,Weight Lifting,39,,7367
2/28/25,Cannondale,Weight Lifting,44,,6976
3/3/25,Peloton,Cycling,20,6.89,
3/3/25,Peloton,Cycling,30,9.85,
3/4/25,Tonal,Weight Lifting,43,,4743
3/4/25,Peloton,Cycling,15,5.09,
3/6/25,Tonal,Weight Lifting,45,,11717
3/7/25,Tonal,Weight Lifting,40,,7174
3/8/25,Peloton,Cycling,15,5,
3/8/25,Peloton,Cycling,15,5.4,
3/8/25,Peloton,Cycling,30,9.97,
3/9/25,Peloton,Cycling,30,11.41,
3/9/25,Peloton,Cycling,30,9.72,
3/9/25,Peloton,Cycling,5,1.41,
3/10/25,Tonal,Weight Lifting,43,,5929
3/11/25,Peloton,Cycling,5,1.54,
3/11/25,Peloton,Cycling,30,9.89,
3/11/25,Peloton,Cycling,10,3.62,
3/11/25,Peloton,Cycling,5,1.56,
3/13/25,Peloton,Cycling,20,6.51,
3/13/25,Peloton,Cycling,15,4.91,
3/14/25,Peloton,Cycling,20,6.82,
3/14/25,Peloton,Cycling,5,1.56,
3/15/25,Tonal,Weight Lifting,47,,12355
3/15/25,Peloton,Cycling,15,3.79,
3/16/25,Tonal,Weight Lifting,42,,7874
3/16/25,Peloton,Cycling,30,9.1,
3/20/25,Tonal,Weight Lifting,45,,6545
3/20/25,Peloton,Cycling,20,6.32,
3/21/25,Tonal,Weight Lifting,48,,10177
3/22/25,Peloton,Cycling,30,9.48,
3/22/25,Peloton,Cycling,30,9.29,
3/22/25,Peloton,Cycling,30,9.16,
3/23/25,Peloton,Cycling,30,9.55,
3/23/25,Peloton,Cycling,30,9.42,
3/24/25,Tonal,Weight Lifting,46,,8178
3/28/25,Peloton,Cycling,15,5.06,
3/28/25,Peloton,Cycling,30,9.92,
3/29/25,Peloton,Cycling,20,6.26,
3/29/25,Peloton,Cycling,5,1.56,
3/30/25,Peloton,Cycling,30,9.75,
3/31/25,Peloton,Cycling,30,9.52,
3/31/25,Peloton,Cycling,10,3.24,
3/31/25,Peloton,Cycling,5,1.61,
4/6/25,Tonal,Weight Lifting,51,,7480
4/6/25,Peloton,Cycling,20,6.37,
4/8/25,Tonal,Weight Lifting,57,,9844
4/12/25,Tonal,Weight Lifting,51,,10961
4/12/25,Peloton,Cycling,20,6.21,
4/13/25,Peloton,Cycling,45,16.2,
4/13/25,Peloton,Cycling,20,5.8,
4/14/25,Cannondale,Weight Lifting,38,,4763
4/15/25,Peloton,Cycling,20,6.57,
4/15/25,Peloton,Cycling,20,6.58,
4/18/25,Tonal,Weight Lifting,40,,6256
4/18/25,Peloton,Cycling,20,6.63,
4/19/25,Tonal,Weight Lifting,36,,7729
4/19/25,Peloton,Cycling,30,9.61,
4/20/25,Peloton,Cycling,20,6.72,
4/20/25,Peloton,Cycling,20,6.64,
4/20/25,Peloton,Cycling,20,6.61,
4/21/25,Tonal,Weight Lifting,38,,6672
4/22/25,Tonal,Weight Lifting,41,,7550
4/24/25,Peloton,Cycling,30,9.32,
4/24/25,Peloton,Cycling,10,3.58,
4/25/25,Tonal,Weight Lifting,41,,6066
4/26/25,Peloton,Cycling,161,50,
4/27/25,Peloton,Cycling,159,50,
4/30/25,Tonal,Weight Lifting,36,,5788
5/1/25,Tonal,Weight Lifting,33,,6989
5/2/25,Peloton,Cycling,30,10.52,
5/3/25,Tonal,Weight Lifting,30,,5714
5/3/25,Peloton,Cycling,31,10,
5/4/25,Peloton,Cycling,60,19.9,
5/5/25,Tonal,Weight Lifting,35,,6746
5/8/25,Tonal,Weight Lifting,36,,8312
5/9/25,Peloton,Cycling,60,20.44,
5/10/25,Tonal,Weight Lifting,32,,7191
5/10/25,Peloton,Cycling,45,13.65,
5/11/25,Tonal,Weight Lifting,26,,6675
5/11/25,Peloton,Cycling,30,9.37,
5/13/25,Tonal,Weight Lifting,25,,9532
5/13/25,Peloton,Cycling,20,6.4,
5/14/25,Peloton,Cycling,30,10.32,
5/16/25,Tonal,Weight Lifting,33,,9514
5/17/25,Peloton,Cycling,46,15.75,
5/18/25,Tonal,Weight Lifting,32,,7019
5/18/25,Peloton,Cycling,30,8.34,
5/21/25,Tonal,Weight Lifting,28,,7325
5/24/25,Tonal,Weight Lifting,25,,10111
5/24/25,Peloton,Cycling,30,9,
5/25/25,Tonal,Weight Lifting,33,,10024
5/25/25,Peloton,Cycling,45,12.23,
5/26/25,Peloton,Cycling,30,8.54,
5/26/25,Peloton,Cycling,30,8.43,
5/28/25,Tonal,Weight Lifting,32,,7877
5/28/25,Peloton,Cycling,20,5.83,
5/29/25,Peloton,Cycling,20,6,
5/29/25,Peloton,Cycling,20,5.84,
5/29/25,Peloton,Cycling,20,5.8,
5/30/25,Peloton,Cycling,20,5.98,
5/30/25,Peloton,Cycling,20,5.92,
6/1/25,Peloton,Cycling,0,2,
6/1/25,Peloton,Cycling,30,10.29,
6/9/25,Peloton,Cycling,30,9.14,
6/9/25,Peloton,Cycling,30,8.52,
6/12/25,Peloton,Cycling,30,9.21,
6/12/25,Peloton,Cycling,45,13.54,
6/13/25,Peloton,Cycling,45,13.9,
6/14/25,Peloton,Cycling,30,8.86,
6/14/25,Tonal,Weight Lifting,26,,8423
6/15/25,Peloton,Cycling,30,8.77,
6/15/25,Peloton,Cycling,45,13.14,
6/16/25,Peloton,Cycling,45,13.46,
6/17/25,Peloton,Cycling,45,13.31,
6/18/25,Peloton,Cycling,30,9.04,
6/19/25,Peloton,Cycling,25,,10884
6/19/25,Peloton,Cycling,45,12.88,
6/20/25,Peloton,Cycling,45,13.67,
6/21/25,Tonal,Weight Lifting,34,,8650
6/21/25,Peloton,Cycling,45,12.89,
6/22/25,Peloton,Cycling,30,8.76,
6/24/25,Peloton,Cycling,45,13.7,
6/26/25,Peloton,Cycling,45,14.16,
6/27/25,Peloton,Cycling,45,13.27,
6/29/25,Tonal,Weight Lifting,32,,7605
6/29/25,Peloton,Cycling,30,8.52,
6/30/25,Peloton,Cycling,30,9.2,
7/1/25,Peloton,Cycling,45,14.2,
7/4/25,Peloton,Cycling,45,12.79,
7/4/25,Tonal,Weight Lifting,27,,8711
7/5/25,Peloton,Cycling,60,17.7,
7/6/25,Peloton,Cycling,45,13.78,
7/6/25,Peloton,Cycling,20,5.96,
7/11/25,Peloton,Cycling,30,9.42,
7/11/25,Peloton,Cycling,20,5.84,
7/12/25,Peloton,Cycling,30,9.34,
7/12/25,Peloton,Cycling,30,8.78,
7/13/25,Peloton,Cycling,30,9.79,
7/13/25,Peloton,Cycling,30,8.95,
7/16/25,Peloton,Cycling,45,14.37,
7/18/25,Peloton,Cycling,30,9.93,
7/18/25,Peloton,Cycling,30,8.93,
7/19/25,Peloton,Cycling,30,9.68,
7/19/25,Peloton,Cycling,30,9.14,
7/20/25,Cannondale,Cycling,46,10.02,
7/23/25,Peloton,Cycling,45,14.53,
7/25/25,Peloton,Cycling,45,13.64,
7/28/25,Peloton,Cycling,45,14.56,
7/29/25,Cannondale,Cycling,36,6.6,
7/31/25,Peloton,Cycling,45,13.28,
8/4/25,Peloton,Cycling,45,15.09,
8/6/25,Peloton,Cycling,30,9.91,
8/7/25,Peloton,Cycling,45,13.77,
8/8/25,Peloton,Cycling,30,9.31,
8/9/25,Peloton,Cycling,30,9.75,
8/9/25,Peloton,Cycling,30,9.15,
8/11/25,Peloton,Cycling,45,13.3,
8/13/25,Peloton,Cycling,30,9.67,
8/14/25,Peloton,Cycling,45,14.52,
8/15/25,Peloton,Cycling,45,14.45,
8/16/25,Cannondale,Cycling,46,9.09,
8/17/25,Cannondale,Cycling,48,8.78,
8/18/25,Tonal,Weight Lifting,27,,9718`;

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    
    data.push(row);
  }
  
  return data;
}

function cleanAndTransformData(rawData) {
  return rawData.map((row, index) => {
    // Parse date - handle M/D/YY format
    let dateStr = row.Date;
    
    const [month, day, year] = dateStr.split('/');
    const fullYear = year.length === 2 ? `20${year}` : year;
    const date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    
    // Clean up activity types - fix data errors
    let activity = row.Activity;
    if (row.Source === 'Tonal' && activity === 'Cycling') {
      activity = 'Weight Lifting'; // Fix data error
    }
    if (row.Source === 'Cannondale' && activity === 'Weight Lifting') {
      activity = 'Cycling'; // Fix data error
    }
    if (row.Source === 'Peloton' && row.Weight && row.Weight !== '') {
      // This looks like a data error - Peloton doesn't track weight lifted
      activity = 'Cycling';
    }
    
    // Parse numeric values
    const minutes = parseInt(row.Mins) || 0;
    const miles = row.Miles && row.Miles !== '' ? parseFloat(row.Miles) : null;
    const weightLifted = row.Weight && row.Weight !== '' ? parseFloat(row.Weight) : null;
    
    return {
      id: `import_${index + 1}`,
      date: date.toISOString(),
      source: row.Source,
      activity: activity,
      minutes: minutes,
      miles: miles,
      weightLifted: weightLifted,
      notes: null
    };
  }).filter(row => row.minutes > 0); // Filter out invalid entries
}

function generateWorkoutData() {
  const rawData = parseCSV(csvData);
  const cleanData = cleanAndTransformData(rawData);
  
  console.log(`Processed ${cleanData.length} workout sessions`);
  
  // Generate the data file
  const dataContent = `export const importedWorkoutData = ${JSON.stringify(cleanData, null, 2)};`;
  
  // Write to a TypeScript file
  fs.writeFileSync(
    path.join(__dirname, '..', 'src', 'data', 'imported-workouts.ts'),
    dataContent
  );
  
  console.log('Data written to src/data/imported-workouts.ts');
  
  // Generate summary stats
  const totalMinutes = cleanData.reduce((sum, session) => sum + session.minutes, 0);
  const totalMiles = cleanData.reduce((sum, session) => sum + (session.miles || 0), 0);
  const totalWeight = cleanData.reduce((sum, session) => sum + (session.weightLifted || 0), 0);
  const totalSessions = cleanData.length;
  
  console.log('\n=== IMPORT SUMMARY ===');
  console.log(`Total Sessions: ${totalSessions}`);
  console.log(`Total Minutes: ${totalMinutes.toLocaleString()}`);
  console.log(`Total Miles: ${totalMiles.toFixed(1)}`);
  console.log(`Total Weight Lifted: ${totalWeight.toLocaleString()} lbs`);
  
  const dateRange = {
    start: new Date(Math.min(...cleanData.map(s => new Date(s.date)))),
    end: new Date(Math.max(...cleanData.map(s => new Date(s.date))))
  };
  
  console.log(`Date Range: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`);
  
  // Activity breakdown
  const activityBreakdown = cleanData.reduce((acc, session) => {
    const key = `${session.source} - ${session.activity}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n=== ACTIVITY BREAKDOWN ===');
  Object.entries(activityBreakdown)
    .sort(([,a], [,b]) => b - a)
    .forEach(([activity, count]) => {
      console.log(`${activity}: ${count} sessions`);
    });
}

generateWorkoutData();
