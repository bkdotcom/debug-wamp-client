import $ from 'jquery' // external global
import { updateCssProperty } from './Css.js'

export function init (config) {
  $('#link-files').on('change', function () {
    var isChecked = $(this).prop('checked')
    var $templateGroup = $('#link-files-template').closest('.form-group')
    isChecked
      ? $templateGroup.slideDown()
      : $templateGroup.slideUp()
  }).trigger('change')

  $('#modal-settings').on('submit', function (e) {
    e.preventDefault()
    config.set({
      url: $('#wsUrl').val(),
      realm: $('#realm').val(),
      fontSize: $('#font-size').val(),
      linkFiles: $('#link-files').prop('checked'),
      linkFilesTemplate: $('#link-files-template').val()
    })
    $(this).modal('hide')
  })

  $('#modal-settings').on('hide.bs.modal', function (e) {
    updateCssProperty('wampClientCss', '#body', 'font-size', config.get('fontSize'))
  })

  $('#modal-settings').on('show.bs.modal', function (e) {
    $('#wsUrl').val(config.get('url'))
    $('#realm').val(config.get('realm'))
    $('#font-size').val(config.get('fontSize'))
    $('#link-files').prop('checked', config.get('linkFiles')).trigger('change')
    $('#link-files-template').val(config.get('linkFilesTemplate'))
  })
}
