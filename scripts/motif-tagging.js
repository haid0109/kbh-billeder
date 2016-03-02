'use strict';

(function($) {

  // VARIABLES
  var $visionNoTags = $('.vision .no-tags');
  var $visionBtn = $('#vision-btn');
  var $visionTags = $('.tags.vision');
  var $crowdNoTags = $('.crowd .no-tags');
  var $crowdBtn = $('#crowd-btn');
  var $crowdTags = $('.tags.crowd');
  var $crowdInput = $('.tags.crowd input');
  var $item = $('.item');
  var catalogAlias = $item.data('catalog-alias');
  var itemId = $item.data('item-id');
  var showError = function(msg) {
    var $error = $('<div class="alert alert-danger">');
    $error.text(msg);
    $crowdTags.append($error);
  };
  var typeaheadTags = new Bloodhound({
    datumTokenizer: function(tags) {
      return Bloodhound.tokenizers.whitespace(tags);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: {
      url: '/motif-tag-suggestions?text=%QUERY',
      wildcard: '%QUERY',
      cache: false
    }
  });

  // FUNCTIONS
  function saveTag(tag) {
    var url = '/' + catalogAlias + '/' + itemId + '/save-crowd-tag';
    var data = {
      tag: tag
    };
    return $.post(url, data, null, 'json');
  }

  function addTag() {
    // Don't submit nothing
    if ($crowdInput.val().length !== 0) {
      var $input = $crowdInput.val();
      var tag = $input.trim().toLowerCase();
      var tagUrl = '/?q=' + encodeURIComponent(tag);
      var $newTag = $('<a href="' + tagUrl + '" class="tag">' + tag + '</a>');
      // Figure out where to add tag by checking if we already have some tags
      if ($('.tags.crowd .tag')) {
        $('.tags.crowd .tag').last().after($newTag);
      } else {
        $crowdTags.prepend($newTag);
      }
      $crowdInput.val('');
      // Save tag in cumulus
      saveTag(tag)
        .done(function() {
          console.log('Tag saved in cumulus');
          contributionCount();
        })
        .fail(function(response) {
          $newTag.remove();
          $crowdInput.val($input);
          var error = response.responseJSON;
          showError(error.message || 'Der skete en uventet fejl.');
        });
    } else {
      console.log('Empty input');
    }
  }

  // ACTIONS
  $visionBtn.click(function() {
    $(this).addClass('loading').children('.text').remove();
    $visionNoTags.remove();
    $.ajax({
      dataType: 'json',
      url: window.location + '/suggested-motif-tags'
    }).done(function(data) {
      $visionBtn.remove();
      console.log(data.tags);
      var arrayLength = data.tags.length;
      if (arrayLength !== 0) {
        for (var i = 0; i < arrayLength; i++) {
          var tag = data.tags[i];
          var tagUrl = '/?q=' + encodeURIComponent(tag);
          var $tag = $('<a href="' + tagUrl + '" class="tag">' + tag +
            '</a>');
          $visionTags.append($tag);
        }
      }
    }).fail(function() {
      console.log('Ajax failed to fetch data');
    });
  });

  $crowdBtn.click(function() {
    if ($crowdTags.hasClass('inputting')) {
      addTag();
    } else {
      $crowdTags.addClass('inputting');
      $crowdTags.find('input').focus();
      $crowdNoTags.remove();
    }
  });

  $crowdInput.keyup(function(event) {
    $('.crowd .alert').remove();
    if (event.keyCode === 13) {
      addTag();
    }
  });

  // Classes for input styling purposes
  $crowdInput.focus(function() {
    $(this).parent('span').addClass('focused valid');
  });
  $crowdInput.blur(function() {
    $(this).parent('span').removeClass('focused');
    if($(this).val().length === 0){
      $(this).parent('span').removeClass('valid');
    }
  });

  // Typeahead: Initialize the bloodhound suggestion engine
  typeaheadTags.initialize();

  $crowdInput.typeahead({
    hint: false,
    highlight: true,
    minLength: 1
  }, {
    name: 'tags',
    source: typeaheadTags
  });

})(jQuery);
