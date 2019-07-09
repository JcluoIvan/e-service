const gulp = require('gulp');
const tsb = require('gulp-tsb');
const tsconfig = require('./tslint.json');
const PATHS = {
    ts: {
        src: './src/**/*.ts',
        dest: 'dist'
    }
};

const compilation = tsb.create({
    ...tsconfig
});

gulp.task('build', function() {});

function buildTS() {
    return gulp
        .src(PATHS.ts.src)
        .pipe(compilation())
        .pipe(gulp.dest(PATHS.ts.dest));
}

function watch() {
    return gulp.watch(PATHS.ts.src, buildTS);
}

gulp.task('default', gulp.parallel(buildTS, watch));
