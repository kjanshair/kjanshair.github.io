var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var cleanCss = require('gulp-clean-css');
var sass = require('gulp-sass');
var watch = require('gulp-watch');

gulp.task('scss-css', function () {    
    return gulp.src(['assets/vendor/main.scss'])
        .pipe(sass().on('error', sass.logError))
   .pipe(gulp.dest('assets'));
});

gulp.task('pack-css', function () {    
    return gulp.src(['assets/vendor/main.scss',
                     'assets/vendor/prism/css/*.css'])
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('main.min.css'))
        .pipe(cleanCss())
   .pipe(gulp.dest('assets'));
});

gulp.task('pack-js', function () {    
    return gulp.src(['assets/vendor/kjanshair/js/*.js',
                     'assets/vendor/prism/js/*.js',
                     'assets/scripts.js'])
        .pipe(concat('main.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('assets'));
});

gulp.task('watch', function(){
    gulp.watch(['assets/vendor/main.scss',
                'assets/vendor/prism/css/*.css',
                'assets/vendor/kjanshair/scss/*.scss'], ['pack-css']);
    gulp.watch(['assets/vendor/kjanshair/js/*.js',
                'assets/vendor/prism/js/*.js',
                'assets/scripts.js'], ['pack-css']);
})
 
gulp.task('default', ['pack-js', 'pack-css']);
gulp.task('dev', ['scss-css']);
