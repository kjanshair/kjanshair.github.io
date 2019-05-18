var gulp = require('gulp');

// gulp.task('copy', function() {

//   // Start Bootstrap Clean Blog SCSS
//   gulp.src(['node_modules/startbootstrap-clean-blog/scss/**/*'])
//     .pipe(gulp.dest('assets/vendor/startbootstrap-clean-blog/scss'))

//   // Start Bootstrap Clean Blog JS
//   gulp.src([
//       'node_modules/startbootstrap-clean-blog/js/clean-blog.min.js',
//       'node_modules/startbootstrap-clean-blog/js/jqBootstrapValidation.js'
//     ])
//     .pipe(gulp.dest('assets/vendor/startbootstrap-clean-blog/js'))

//   // Bootstrap
//   gulp.src([
//       'node_modules/bootstrap/dist/**/*',
//       '!**/npm.js',
//       '!**/bootstrap-theme.*',
//       '!**/*.map'
//     ])
//     .pipe(gulp.dest('assets/vendor/bootstrap'))

//   // jQuery
//   gulp.src(['node_modules/jquery/dist/jquery.js', 'node_modules/jquery/dist/jquery.min.js'])
//     .pipe(gulp.dest('assets/vendor/jquery'))

//   // Font Awesome
//   gulp.src([
//       'node_modules/font-awesome/**',
//       '!node_modules/font-awesome/**/*.map',
//       '!node_modules/font-awesome/.npmignore',
//       '!node_modules/font-awesome/*.txt',
//       '!node_modules/font-awesome/*.md',
//       '!node_modules/font-awesome/*.json'
//     ])
//     .pipe(gulp.dest('assets/vendor/font-awesome'))

// })

// // Default task
// gulp.task('default', ['copy']);

// ----

var gulp = require('gulp');
var concat = require('gulp-concat');
// var minify = require('gulp-minify');
var cleanCss = require('gulp-clean-css');
var sass = require('gulp-sass');

gulp.task('pack-css', function () {    
    return gulp.src(['assets/main.scss', 'assets/vendor/prism/css/*.css'])
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('main.min.css'))
        .pipe(cleanCss())
   .pipe(gulp.dest('assets'));
});
 
// gulp.task('pack-js', function () {    
//     return gulp.src(['assets/js/vendor/*.js', 'assets/js/main.js', 'assets/js/module*.js'])
//         .pipe(concat('bundle.js'))
//         .pipe(minify())
//         .pipe(gulp.dest('public/build/js'));
// }); 
 
gulp.task('default', ['pack-css']);
// gulp.task('default', ['pack-js', 'pack-css']);
