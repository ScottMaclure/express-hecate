/*global module */

/**
 * Main demonstration page.
 */
module.exports.index = function(req, res){
    res.render('usage', {
        title: 'Usage Examples'
    });
};
