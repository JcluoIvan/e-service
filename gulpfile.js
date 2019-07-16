const gulp = require('gulp');
const ts = require('gulp-typescript');
const tsp = ts.createProject('tsconfig.json');
const PATHS = {
    server: {
        src: './src/**/*.ts',
        dest: './dist',
    },
    customer: {
        src: './src-customer/**/*.ts',
        dest: 'public/assets/js/es-customer',
    },
};

const buildServer = {
    build() {
        return gulp
            .src(PATHS.server.src)
            .pipe(tsp())
            .pipe(gulp.dest(PATHS.server.dest));
    },
    watch() {
        return gulp.watch(PATHS.server.src, buildServer.build);
    },
};

const buildESCustomer = {
    build() {
        const ctsp = ts.createProject('tsconfig.json', {
            target: 'es5',
            module: "system",
            outFile: 'es-customer.js',
            noImplicitAny: true,
            removeComments: true,
            preserveConstEnums: true,
        });
        return gulp
            .src(PATHS.customer.src)
            .pipe(ctsp())
            .pipe(gulp.dest(PATHS.customer.dest));
    },
    watch() {
        return gulp.watch(PATHS.customer.src, buildESCustomer.build);
    },
};

gulp.task('default', gulp.parallel(buildServer.build, buildServer.watch));
gulp.task('customer', gulp.parallel(buildESCustomer.build, buildESCustomer.watch));
