const { execSync } = require('child_process');
const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsp = ts.createProject('tsconfig.json');



function buildMigrations(filename) {
    return gulp
        .src(`./migrations/${filename}`)
        .pipe(tsp())
        .pipe(gulp.dest('./migrations'));
}

const res = execSync('typeorm migration:generate -n DB').toString();
const [filename = null] = res.match(/\d+-DB\.ts/) || [];
if (filename) {
    buildMigrations(filename);
    console.info(`Success: ${filename}`);
} else {
    console.info(`Err: ${res}`);
}

// console.info(res.toString());
// buildMigrations();
