const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsp = ts.createProject('tsconfig.json');
const PATHS = {
    ts: {
        src: './src/**/*.ts',
        dest: 'dist',
    },
};

gulp.task('build', function() {});
function buildTS() {
    return gulp
        .src(PATHS.ts.src)
        .pipe(tsp())
        .pipe(gulp.dest(PATHS.ts.dest));
}

function watch() {
    return gulp.watch(PATHS.ts.src, buildTS);
}

gulp.task('default', gulp.parallel(buildTS, watch));
