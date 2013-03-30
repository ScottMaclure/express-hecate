/*global module */

/**
 * Home page.
 */
module.exports.show = function(req, res){
    res.render('index', {
        title: 'Express Router'
    });
};
