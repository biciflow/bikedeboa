/* eslint no-console: ["warn", { allow: ["log", "warn", "error"] }] */
/* eslint-env node, jquery */

$(() => {
  function getPinColorFromAverage(average) {
    let pinColor;

    if (average) {
      if (!average || average === 0) {
        pinColor = 'gray';
      } else if (average > 0 && average <= 2) {
        pinColor = 'red'; 
      } else if (average > 2 && average < 3.5) {
        pinColor = 'yellow';
      } else if (average >= 3.5) {
        pinColor = 'green';
      } else {
        pinColor = 'gray';
      }
    } else {
      pinColor = 'gray';
    }

    return pinColor; 
  }

  function openShareDialog() {
    // const shareUrl = window.location.origin + getMarkerShareUrl(openedMarker);
    const shareUrl = 'https://www.bikedeboa.com.br' + getMarkerShareUrl(openedMarker);

    swal({ 
      imageUrl: _isMobile ? '' : '/img/icon_share.svg',
      imageWidth: 80,
      imageHeight: 80,
      customClass: 'share-modal',
      html:
        `Compartilhe este bicicletário<br><br>
        <div class="share-icons">
          <iframe src="https://www.facebook.com/plugins/share_button.php?href=${encodeURIComponent(shareUrl)}&layout=button&size=large&mobile_iframe=true&width=120&height=28&appId=1814653185457307" width="120" height="28" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowTransparency="true"></iframe>
          <a target="_blank" href="https://twitter.com/share" data-size="large" class="twitter-share-button"></a>
          <button class="share-email-btn">
            <a target="_blank" href="mailto:?subject=Saca só esse bicicletário&amp;body=${shareUrl}" title="Enviar por email">
              <span class="glyphicon glyphicon-envelope"></span><span class="share-email-label">Email</span> 
            </a>
          </button>
        </div>
        <hr>
        ...ou clique para copiar o link<br><br>
        <div class="share-url-container">
          <span class="glyphicon glyphicon-link share-url-icon"></span>
          <textarea id="share-url-btn" onclick="this.focus();this.select();" readonly="readonly" rows="1" data-toggle="tooltip" data-trigger="manual" data-placement="top" data-html="true" data-title="Copiado!">${shareUrl}</textarea>
        </div>`,
      showConfirmButton: false,
      showCloseButton: true,
      onOpen: () => {
        // Initializes Twitter share button
        twttr.widgets.load();

        // Copy share URL to clipboard
        $('#share-url-btn').on('click', e => {
          ga('send', 'event', 'Local', 'share - copy url to clipboard', ''+openedMarker.id);

          copyToClipboard(e.currentTarget);
 
          // Tooltip
          $('#share-url-btn').tooltip('show');
          $('#share-url-btn').one('mouseout', () => {
            $('#share-url-btn').tooltip('hide');
          });
        });
      }
    });
  }

  function initHelpTooltip(selector) {
    if (!_isMobile) {
      $(selector).tooltip();
    } else {
      $(selector).off('click').on('click', e => {
        const $tooltipEl =$(e.currentTarget);
        swal({
          customClass: 'tooltip-modal',
          html: $tooltipEl.data('title')
        });
      });
    }
  }

  function openDetailsModal(marker) {
    if (!marker) {
      console.error('Trying to open details modal without a marker.');
      return;
    }

    openedMarker = marker;
    const m = openedMarker;
 
    if (addLocationMode) {
      return false;
    }

    ga('send', 'event', 'Local', 'view', ''+m.id);

    let templateData = {
      title: m.text,
      address: m.address,
      description: m.description,
      average: m.average
    };
 
    templateData.pinColor = getPinColorFromAverage(m.average);

    const staticImgDimensions = _isMobile ? '400x70' : '1000x100';
    templateData.mapStaticImg = `https://maps.googleapis.com/maps/api/staticmap?size=${staticImgDimensions}&markers=icon:https://www.bikedeboa.com.br/img/pin_${templateData.pinColor}.png|${m.lat},${m.lng}&key=${GOOGLEMAPS_KEY}&${_gmapsCustomStyleStaticApi}`;

    // Tags
    if (m.tags && m.tags.length > 0) {
      const MAX_TAG_COUNT = m.reviews;
      const MIN_TAG_OPACITY = 0.2;

      templateData.tags = m.tags
        .sort((a, b) => {return b.count - a.count;})
        .map(t => {
          // Tag opacity is proportional to count
          // @todo refactor this to take into account Handlebars native support for arrays
          const opacity = t.count/MAX_TAG_COUNT + MIN_TAG_OPACITY;
          return t.count > 0 ? `<span class="tagDisplay" style="opacity: ${opacity}">${t.name} <span class="tag-count">${t.count}</span></span>` : '';
        })
        .join('');
    }

    // Reviews, checkins
    if (m.reviews === '0') {
      templateData.numReviews = 'Nenhuma avaliação :(';
    } else if (m.reviews === '1') {
      templateData.numReviews = '1 avaliação';
    } else {
      templateData.numReviews = `${m.reviews} avaliações`;
    }
    
    // templateData.numCheckins = m.checkin && (m.checkin + ' check-ins') || '';

    if (loggedUser) {
      templateData.isLoggedUser = true;
      templateData.canModify = true;
    } else if (BIKE.Session.getPlaceFromSession(m.id)) {
      templateData.canModify = true;
      templateData.temporaryPermission = true;
    }

    // Route button
    templateData.gmapsRedirectUrl = `https://www.google.com/maps/preview?daddr=${m.lat},${m.lng}&dirflg=b`;

    // Photo
    templateData.photoUrl = m.photo;

    // Is public?
    if (m.isPublic != null) {
      templateData.isPublic = m.isPublic === true;
    } else {
      templateData.noIsPublicData = true;
    }

    // Structure type
    let structureTypeIcon;
    switch (m.structureType) {
    case 'uinvertido': structureTypeIcon = '/img/tipo_uinvertido.svg'; break;
    case 'deroda': structureTypeIcon = '/img/tipo_deroda.svg'; break;
    case 'trave': structureTypeIcon = '/img/tipo_trave.svg'; break;
    case 'suspenso': structureTypeIcon = '/img/tipo_suspenso.svg'; break;
    case 'grade': structureTypeIcon = '/img/tipo_grade.svg'; break;
    case 'other': structureTypeIcon = '/img/tipo_other.svg'; break;
    }
    if (m.structureType) {
      templateData.structureTypeCode = m.structureType;
      templateData.structureTypeLabel = 'Bicicletário ' + STRUCTURE_CODE_TO_NAME[m.structureType];
    }
    templateData.structureTypeIcon = structureTypeIcon;

    // Retrieves a previous review saved in session
    const previousReview = BIKE.Session.getReviewFromSession(m.id);
    if (previousReview) {
      templateData.savedRating = previousReview.rating;
    }


    ////////////////////////////////
    // Render handlebars template //
    ////////////////////////////////
    $('#placeDetailsModalTemplatePlaceholder').html(templates.placeDetailsModalTemplate(templateData));

    if (m.average) {
      $('input[name=placeDetails_rating]').val(['' + Math.round(m.average)]);
    } else {
      $('#ratingDisplay').addClass('empty');
    }

    $('.photo-container img').on('load', e => {
      $(e.target).parent().removeClass('loading');
    });
 
    // Init click callbacks
    // $('#checkinBtn').on('click', sendCheckinBtn);
    $('.rating-input-container .full-star, .openReviewPanelBtn').off('click').on('click', e => {
      openReviewModal($(e.target).data('value'));
    });
    $('.shareBtn').off('click').on('click', e => {
      ga('send', 'event', 'Local', 'share', ''+openedMarker.id);
      
      openShareDialog();
    });
    $('.photo-container img').off('click').on('click', e => {
      toggleExpandModalHeader();
    });
    $('.directionsBtn').off('click').on('click', e => {
      ga('send', 'event', 'Local', 'directions', ''+openedMarker.id);
    });
    $('#editPlaceBtn').off('click').on('click', queueUiCallback.bind(this, openNewOrEditPlaceModal));
    $('#deletePlaceBtn').off('click').on('click', queueUiCallback.bind(this, deletePlace));
    $('#createRevisionBtn').off('click').on('click', queueUiCallback.bind(this, openRevisionDialog));

    if (_isMobile) {
      $('#placeDetailsModal .minimap').on('click', () => {
        const markerPos = {
          lat: parseFloat(openedMarker.lat),
          lng: parseFloat(openedMarker.lng)
        };

        switchToMap().then( () => {
          // @todo fix me! weird bug with transitions and gmaps forces me to do this, sorry
          // setTimeout( () => {
            map.setCenter(markerPos);
          // }, 600);
        });
      })
    } 

    // Tooltips
    if (!_isTouchDevice) {
      $('#placeDetailsModal .full-star').tooltip({
        toggle: 'tooltip',
        placement: 'bottom',
        'delay': {'show': 0, 'hide': 100}
      });
    }
    initHelpTooltip('#placeDetailsModal .help-tooltip-trigger')

    $('#public-access-help-tooltip').off('show.bs.tooltip').on('show.bs.tooltip', () => {
      ga('send', 'event', 'Misc', 'tooltip - pin details public access');
    });
    $('#private-access-help-tooltip').off('show.bs.tooltip').on('show.bs.tooltip', () => {
      ga('send', 'event', 'Misc', 'tooltip - pin details private access');
    });
    $('#uinvertido-type-help-tooltip').off('show.bs.tooltip').on('show.bs.tooltip', () => {
      ga('send', 'event', 'Misc', 'tooltip - pin details uinvertido type');
    });
    $('#deroda-type-help-tooltip').off('show.bs.tooltip').on('show.bs.tooltip', () => {
      ga('send', 'event', 'Misc', 'tooltip - pin details deroda type');
    });
    $('#trave-type-help-tooltip').off('show.bs.tooltip').on('show.bs.tooltip', () => {
      ga('send', 'event', 'Misc', 'tooltip - pin details trave type');
    });
    $('#suspenso-type-help-tooltip').off('show.bs.tooltip').on('show.bs.tooltip', () => {
      ga('send', 'event', 'Misc', 'tooltip - pin details suspenso type');
    });
    $('#grade-type-help-tooltip').off('show.bs.tooltip').on('show.bs.tooltip', () => {
      ga('send', 'event', 'Misc', 'tooltip - pin details grade type');
    });
    $('#other-type-help-tooltip').off('show.bs.tooltip').on('show.bs.tooltip', () => {
      ga('send', 'event', 'Misc', 'tooltip - pin details other type');
    });

    // Display the modal
    if (!$('#placeDetailsModal').is(':visible')) {
      // $('section, .modal-footer').css({opacity: 0});

      $('#placeDetailsModal')
        .one('show.bs.modal', () => { 
          // Global states
          $('body').addClass('details-view');
          if (previousReview) {
            $('body').addClass('already-reviewed');
          } else {
            $('body').removeClass('already-reviewed');
          }
        })
        .one('shown.bs.modal', () => { 
          // Animate modal content
          // $('section, .modal-footer').velocity('transition.slideDownIn', {stagger: STAGGER_NORMAL, queue: false});
          // if (!templateData.savedRating) {
          //   $('#bottom-mobile-bar').velocity("slideDown", { easing: 'ease-out', duration: 700 });
          // }

          // Fixes bug in which Bootstrap modal wouldnt let anything outside it be focused
          // Thanks to https://github.com/limonte/sweetalert2/issues/374
          $(document).off('focusin.modal');

          // @todo do this better please
          if (window._openLocalCallback && typeof window._openLocalCallback === 'function') {
            window._openLocalCallback();
            window._openLocalCallback = undefined;
          }
        })
        .one('hidden.bs.modal', () => {
          $('body').removeClass('details-view');
        })
        .modal('show');
    } else { 
      // Just fade new detailed content in
      // $('#placeDetailsModal .photo-container, #placeDetailsModal .tagsContainer').velocity('transition.fadeIn', {stagger: STAGGER_NORMAL, queue: false});
      $('#placeDetailsModal .tagsContainer').velocity('transition.fadeIn', {stagger: STAGGER_NORMAL, queue: false});
    }
  }

  function updateGeoPosition(newPos) {
    _userCurrentPosition = { 
      lat: newPos.coords.latitude,
      lng: newPos.coords.longitude
    };
    
    if (map && _geolocationMarker) {
      _geolocationRadius.setRadius(newPos.coords.accuracy);
      _geolocationRadius.setCenter(_userCurrentPosition);
      
      _geolocationMarker.setPosition(_userCurrentPosition);
    }
  }

  function initMapsGeolocation() {
    _geolocationMarker = new google.maps.Marker({
      map: map,
      clickable: false,
      icon: {
        url: '/img/current_position.svg', // url
        scaledSize: new google.maps.Size(CURRENT_LOCATION_MARKER_W, CURRENT_LOCATION_MARKER_H), // scaled size
        origin: new google.maps.Point(0, 0), // origin
        anchor: new google.maps.Point(CURRENT_LOCATION_MARKER_W/2, CURRENT_LOCATION_MARKER_H/2), // anchor
      },
      position: _userCurrentPosition
    });

    _geolocationRadius = new google.maps.Circle({
      map: map,
      clickable: false,
      fillColor: '#705EC7',
      fillOpacity: '0.2',
      strokeColor: 'transparent',
      strokeOpacity: '0',
      position: _userCurrentPosition
    });

    _geolocationRadius.setVisible(true);
    if (markers && markers.length) {
      _geolocationMarker.setZIndex(markers.length);
    }

    map.panTo(_userCurrentPosition);
    
    // Minimum map zoom
    if (map.getZoom() < 17) {
      map.setZoom(17);
    }
  }

  function geolocate(quiet = false) {
    return new Promise( (resolve, reject) => {
      if (navigator.geolocation) {
        // @todo split both behaviors into different functions
        if (_geolocationInitialized) {
          if (map) {
            // Geolocation might've been initalized without google maps
            if (!_geolocationMarker) {
              initMapsGeolocation();
            }

            map.panTo(_userCurrentPosition);
             
            // Minimum map zoom
            if (map.getZoom() < 17) {
              map.setZoom(17);
            }
          }

          resolve(); 
        } else {
          const geoOptions = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }; 

          navigator.geolocation.getCurrentPosition(
              position => {
                ga('send', 'event', 'Geolocation', 'init', `${position.coords.latitude},${position.coords.longitude}`);

                updateGeoPosition(position);
                 
                if (map) {
                  initMapsGeolocation();
                }

                _geolocationInitialized = true;
                $('#geolocationBtn').addClass('active');
                
                if (_positionWatcher) {
                  navigator.geolocation.clearWatch(_positionWatcher);
                }
                _positionWatcher = navigator.geolocation.watchPosition(updateGeoPosition, null, geoOptions);
   
                resolve();
              },
              error => {
                ga('send', 'event', 'Geolocation', error.message ? `fail - ${error.message}`: 'fail - no_message');

                console.error('Geolocation failed.', error);

                if (!quiet) {
                  switch(error.code) {
                  case 1:
                    // PERMISSION_DENIED
                    if (_isFacebookBrowser) {
                      swal('Ops', 'Seu navegador parece não suportar essa função, que pena. Que tal tentar denovo no Chrome?', 'warning');
                    } else {
                      swal('Ops', 'Sua localização parece estar desabilitada, ou seu navegador suporta essa função. Quem sabe tenta dar uma olhada nas configurações do seu dispositivo?', 'warning');
                    }
                    break; 
                  case 2:
                    // POSITION_UNAVAILABLE
                    swal('Ops', 'A geolocalização parece não estar funcionando. Já verificou se o GPS está ligado?', 'warning');
                    break;
                  case 3:
                    // TIMEOUT
                    swal('Ops', 'A geolocalização do seu dispositivo parece não estar funcionando agora. Mas tente de novo que deve dar ;)', 'warning');
                    break;
                  }
                }

                // Secure Origin issue test by Google: https://developers.google.com/web/updates/2016/04/geolocation-on-secure-contexts-only?hl=en
                if(error.message.indexOf('Only secure origins are allowed') == 0) {
                  // Disable button since it won't work anyway in the current domain.
                  $('#geolocationBtn').hide();
                }

                reject(); 
              },
              geoOptions
          );
        }
      } else {
        console.error('Navigator doesnt support geolocation.');
        
        if (!quiet) {
          swal('Ops', 'Seu navegador parece não suportar essa função, que pena.', 'warning');
        }

        reject();
      }
    });
  }

  function getMarkerById(id) {
    if (id && id >= 0) {
      const res = markers.filter( i => i.id === id );
      if (res.length > 0) {
        return res[0];
      }
    }
  }

  function getMarkerShareUrl(marker) {
    let url = `/b/${marker.id}`;
    if (marker.text) {
      url += `-${slugify(marker.text)}`;
    }

    return url;
  }

  // Just delegate the action to the route controller
  function openLocal(marker, callback) {
    let url = getMarkerShareUrl(marker);

    window._openLocalCallback = callback;

    marker.url = url;
    setView(marker.text || 'Detalhes do bicicletário', url);
  }

  function _openLocal(marker, callback) {
    if (marker) {
      openDetailsModal(marker, callback);

      if (!marker._hasDetails) {
        // Request content
        Database.getPlaceDetails(marker.id, () => {
          if (openedMarker && openedMarker.id === marker.id) {
            openDetailsModal(marker, callback);
          }
        });
      }
    }
  }

  function _openLocal(marker, callback) {
    if (marker) {
      openDetailsModal(marker, callback);

      if (!marker._hasDetails) {
        // Request content
        Database.getPlaceDetails(marker.id, () => {
          if (openedMarker && openedMarker.id === marker.id) {
            openDetailsModal(marker, callback);
          }
        });
      }
    }
  }

  function updateFilters() {
    let filters = [];
    $('.filter-checkbox:checked').each( (i, f) => {
      const p = $(f).data('prop');
      let v = $(f).data('value'); 

      filters.push({prop: p, value: v});
    });
 
    const resultsCount = applyFilters(filters);
    if (filters.length > 0) {
      $('#filter-results-counter').html(resultsCount);
      $('#active-filters-counter').html(filters.length);
      $('#filterBtn').toggleClass('active', true);
      $('#filter-results-counter-container').velocity({ opacity: 1 });
      $('#clear-filters-btn').velocity({ opacity: 1 });
    } else {
      $('#filter-results-counter-container').velocity({ opacity: 0 });
      $('#clear-filters-btn').velocity({ opacity: 0 });
      $('#active-filters-counter').html('');
      $('#filterBtn').toggleClass('active', false);
    }
  }

  // Array of filters in the form of [{prop: 'a property', value: 'a value'}, ...]
  // Logical expression: 
  //   showIt = (prop1_val1 OR ... OR prop1_valN) AND
  //            (prop2_val1 OR ... OR prop2_valN) AND 
  //            ...
  //            (propN_val1 OR ... OR propN_valN)
  function applyFilters(filters = []) {
    let cont = 0;

    const isPublicFilters = filters.filter(i => i.prop === 'isPublic');
    const ratingFilters = filters.filter(i => i.prop === 'rating');
    const structureFilters = filters.filter(i => i.prop === 'structureType');
    const categories = [isPublicFilters, ratingFilters, structureFilters];

    for(let i=0; i < markers.length; i++) {
      const m = markers[i];
      let showIt = true;

      // Apply all filters to this marker
      for(let cat=0; cat < categories.length && showIt; cat++) {
        let catResult = false;
        
        if (categories[cat].length) {
          for(let f_index=0; f_index < categories[cat].length && showIt; f_index++) {
            const f = categories[cat][f_index];
            let testResult;

            if (f.prop !== 'rating') {
              testResult = m[f.prop] === f.value;
            } else {
              // Custom test case: rating range
              switch (f.value) {
              case 'good':
                testResult = m.average >= 3.5;
                break;
              case 'medium':
                testResult = m.average > 2 && m.average < 3.5;
                break;
              case 'bad':
                testResult = m.average > 0 && m.average <= 2;
                break;
              case 'none':
                testResult = m.average === null;
                break;
              }
            }
            
            // Filters inside each category are compared with OR
            catResult = catResult || testResult;
          }
          
          // Category are compared with each other with AND
          showIt = showIt && catResult;
        }
      }

      // _gmarkers[i].setMap(showIt ? map : null);
      _gmarkers[i].setIcon(showIt ? m.icon : m.iconMini);
      _gmarkers[i].setOptions({clickable: showIt, opacity: (showIt ? 1 : 0.3)});
      _gmarkers[i].collapsed = !showIt;
      cont += showIt ? 1 : 0;
    }

    _activeFilters = filters.length;

    return cont;
  }

  function clearFilters() {
    _activeFilters = null;
    setMapOnAll(map);
  }

  function updateMarkers() {
    if (!map) {
      return false;
    }

    clearMarkers();

    if (_geolocationMarker) {
      _geolocationMarker.setZIndex(markers.length);
    }

    // Markers from Database
    if (markers && markers.length > 0) {
      // Order by average so best ones will have higher z-index
      // markers = markers.sort((a, b) => {
      //   return a.average - b.average;
      // });

      for(let i=0; i < markers.length; i++) {
        const m = markers[i];

        if (m) {
          // Icon and Scaling
          let scale;
          let iconType, iconTypeMini;
          if (!m.average || m.average === 0) {
            iconType = MARKER_ICON_GRAY;
            iconTypeMini = MARKER_ICON_GRAY_MINI;
            scale = 0.8;
          } else if (m.average > 0 && m.average <= 2) {
            iconType = MARKER_ICON_RED;
            iconTypeMini = MARKER_ICON_RED_MINI;
          } else if (m.average > 2 && m.average < 3.5) {
            iconType = MARKER_ICON_YELLOW;
            iconTypeMini = MARKER_ICON_YELLOW_MINI;
          } else if (m.average >= 3.5) {
            iconType = MARKER_ICON_GREEN;
            iconTypeMini = MARKER_ICON_GREEN_MINI;
          } else {
            iconType = MARKER_ICON_GRAY;
            iconTypeMini = MARKER_ICON_GRAY_MINI;
          }
          if (!scale) {
            scale = 0.5 + (m.average/10);
          }

          m.icon = {
            url: iconType, // url
            scaledSize: new google.maps.Size((MARKER_W*scale), (MARKER_H*scale)), // scaled size
            origin: new google.maps.Point(0, 0), // origin
            anchor: new google.maps.Point((MARKER_W*scale)/2, (MARKER_H*scale)), // anchor
          };

          m.iconMini = {
            url: iconTypeMini, // url
            scaledSize: new google.maps.Size((MARKER_W_MINI*scale), (MARKER_H_MINI*scale)), // scaled size
            origin: new google.maps.Point(0, 0), // origin
            anchor: new google.maps.Point((MARKER_W_MINI*scale)/2, (MARKER_H_MINI*scale)/2), // anchor
          };

          if (m.lat && m.lng) {
            // @todo temporarily disabled this because backend still doesnt support flags for these
            // let labelStr;
            // if (loggedUser && (!m.photo || !m.structureType || m.isPublic == null)) {
            //   labelStr = '?';
            // }

            _gmarkers.push(new google.maps.Marker({
              position: {
                lat: parseFloat(m.lat),
                lng: parseFloat(m.lng)
              },
              map: map,
              icon: m.icon,
              // title: m.text,
              // label: labelStr && {
              //   text: labelStr,
              //   color: 'white',
              // },
              zIndex: i, //markers should be ordered by average
              // opacity: 0.1 + (m.average/5).
            }));

            // Info window
            let templateData = {
              title: m.text,
              average: m.average,
              roundedAverage: m.average && ('' + Math.round(m.average)),
              pinColor: getPinColorFromAverage(m.average)
            };

            templateData.thumbnailUrl = m.photo ? m.photo.replace('images', 'images/thumbs') : '';

            // @todo: encapsulate both the next 2 in one method
            // Reviews count
            if (m.reviews === 0) {
              templateData.numReviews = '';
            } else if (m.reviews === '1') {
              templateData.numReviews = '1 avaliação';
            } else {
              templateData.numReviews = `${m.reviews} avaliações`;
            }

            // Structure and access types
            if (m.isPublic != null) {
              templateData.isPublic = m.isPublic === true; 
            } else {
              templateData.noIsPublicData = true;
            }
            if (m.structureType) {
              templateData.structureTypeLabel = STRUCTURE_CODE_TO_NAME[m.structureType];
            }

            const contentString = templates.infoWindowTemplate(templateData);

            if (_isTouchDevice) {
              // Infobox preview on click
              _gmarkers[i].addListener('click', () => {
                ga('send', 'event', 'Local', 'infobox opened', m.id); 

                map.panTo(_gmarkers[i].getPosition());

                _infoWindow.setContent(contentString);
                _infoWindow.open(map, _gmarkers[i]);
                _infoWindow.addListener('domready', () => {
                  $('.infobox--img img').off('load').on('load', e => {
                    $(e.target).parent().removeClass('loading');
                  });

                  $('.infoBox').off('click').on('click', () => {
                    openLocal(markers[i]);
                    _infoWindow.close();
                  });
                });
              });

              map.addListener('click', () => {
                _infoWindow.close();
              });
            } else {
              // No infobox, directly opens the details modal
              _gmarkers[i].addListener('click', () => {
                openLocal(markers[i]);
              });

              // Infobox preview on hover
              _gmarkers[i].addListener('mouseover', () => {
                ga('send', 'event', 'Local', 'infobox opened', m.id); 

                _infoWindow.setContent(contentString); 
                _infoWindow.open(map, _gmarkers[i]);
                _infoWindow.addListener('domready', () => {
                  $('.infobox--img img').off('load').on('load', e => {
                    $(e.target).parent().removeClass('loading');
                  });
                });
              });

              _gmarkers[i].addListener('mouseout', () => {
                _infoWindow.close();
              });
            }
          } else {
            console.error('error: pin with no latitude/longitude');
          }
        } else {
          console.error('marker is weirdly empty on addMarkerToMap()');
        }
      }
    }
  }

  // Sets the map on all markers in the array.
  function setMapOnAll (map) {
    if (_gmarkers && Array.isArray(_gmarkers)) {
      for (let i = 0; i < _gmarkers.length; i++) {
        _gmarkers[i].setMap(map);
      }
    }
  }

  // Removes the markers from the map, but keeps them in the array.
  function hideMarkers () {
    areMarkersHidden = true;
    if (_gmarkers && Array.isArray(_gmarkers)) {
      for (let i = 0; i < _gmarkers.length; i++) {
        _gmarkers[i].setOptions({clickable: false, opacity: 0.3});
      }
    }
  }

  // Shows any markers currently in the array.
  function showMarkers () {
    areMarkersHidden = false;
    if (_gmarkers && Array.isArray(_gmarkers)) {
      for (let i = 0; i < _gmarkers.length; i++) {
        _gmarkers[i].setOptions({clickable: true, opacity: 1});
      }
    }
  }

  // Switches all marker icons to the full or the mini scale
  function setMarkersIcon (scale) {
    if (_gmarkers && Array.isArray(_gmarkers)) {
      let m;
      for (let i = 0; i < _gmarkers.length; i++) {
        m = markers[i];
        _gmarkers[i].setIcon(scale === 'mini' ? m.iconMini : m.icon);
      }
    }
  }

  // Deletes all markers in the array by removing references to them.
  function clearMarkers () {
    setMapOnAll(null);
    _gmarkers = [];
  }

  function toggleMarkers() {
    if (areMarkersHidden) {
      showMarkers();
    } else {
      hideMarkers();
    }
  }

  function isPosWithinBounds(pos) {
    const ret = _mapBounds.contains(pos);
    return ret;
  }

  function mapCenterChanged() {
    // Makes sure this doesnt destroy the overall performance by limiting these calculations 
    //   to not be executed more then 20 times per second (1000ms/50ms = 20x).
    // (I'm not entirely sure this is needed though, but why not)
    clearTimeout(_centerChangedTimeout);
    _centerChangedTimeout = setTimeout( () => {
      // console.log('centerchanged');

      // Check center
      const isCenterWithinBounds = isPosWithinBounds(map.getCenter());
      $('#newPlaceholder').toggleClass('invalid', !isCenterWithinBounds);

      // Check visible bounds
      if (map.getBounds()) {
        const isViewWithinBounds = map.getBounds().intersects(_mapBounds);        
        $('#out-of-bounds-overlay').toggleClass('showThis', !isViewWithinBounds); 
      }
    }, 50);
  }

  function toggleLocationInputMode() {
    addLocationMode = !addLocationMode;
    const isTurningOn = addLocationMode;

    if (isTurningOn) {
      map.setOptions({styles: _gmapsCustomStyle_withLabels});

      $('body').addClass('position-pin-mode');

      $('#newPlaceholder').on('click', queueUiCallback.bind(this, () => {
        // Queries Google Geocoding service for the position address
        const mapCenter = map.getCenter();
        newMarkerTemp = {lat: mapCenter.lat(), lng: mapCenter.lng()};
        BIKE.geocodeLatLng(
          newMarkerTemp.lat, newMarkerTemp.lng,
          (address) => {
            // console.log('Resolved location address:');
            // console.log(address);
            newMarkerTemp.address = address;
          }, () => {
          }
        );

        if (openedMarker) {
          // Was editing the marker position, so return to Edit Modal
          const mapCenter = map.getCenter();
          openedMarker.lat = mapCenter.lat();
          openedMarker.lng = mapCenter.lng();
          openNewOrEditPlaceModal();
        } else {
          if (isPosWithinBounds(map.getCenter())) {
            openNewOrEditPlaceModal();
          } else {
            const mapCenter = map.getCenter();
            ga('send', 'event', 'Local', 'out of bounds', `${mapCenter.lat()}, ${mapCenter.lng()}`); 

            swal({
              title: 'Ops',
              html:
                `Foi mal, por enquanto ainda não dá pra adicionar bicicletários nesta região.
                <br><br>
                <small>
                  <i>Acompanha nosso <a target="_blank" href="https://www.facebook.com/bikedeboaapp">
                  Facebook</a> para saber novidades sobre nossa cobertura, e otras cositas mas. :)</i>
                </small>`,
              type: 'warning',
            });
          }
        }

        toggleLocationInputMode();
      }));

      // ESC button cancels locationinput
      $(document).on('keyup.disableInput', e => {
        if (e.keyCode === 27) {
          toggleLocationInputMode();
        }
      });

      // Adjust for a minimum zoom for improved recommended precision
      // if (map.getZoom() < 18) {
      //   map.setZoom(18);
      // }
    } else {
      // Turning OFF

      map.setOptions({styles: _gmapsCustomStyle});

      $('#newPlaceholder').off('click');
      $(document).off('keyup.disableInput');
      $('body').removeClass('position-pin-mode');
      
      // Clear centerChanged event
      // if (map) {
      //   google.maps.event.clearInstanceListeners(map);
      // }
    }

    toggleMarkers();
    $('#addPlace').toggleClass('active');
    $('#addPlace > span').toggle();
    $('#newPlaceholder').toggleClass('active');
    $('#newPlaceholderShadow').toggle();
    $('#newPlaceholderTarget').toggle();

    if (!isTurningOn && openedMarker) { 
      // Was editing the marker position, so return to Edit Modal
      openNewOrEditPlaceModal();
    }
  }

  function showUI() {
    // $('#locationSearch').velocity('transition.slideDownIn', {queue: false});
    // $('#addPlace').velocity('transition.slideUpIn');
    // $('#locationSearch').removeClass('hidden-ui'); 
    // $('#addPlace').removeClass('hidden-ui');
    // $('#geolocationBtn').removeClass('hidden-ui');
    $('.hidden-ui').removeClass('hidden-ui');
  }

  function hideUI() {
    // $('#locationSearch').velocity('transition.slideUpOut', {queue: false});
    // $('#addPlace').velocity('transition.slideDownOut');
    $('#locationSearch').addClass('hidden-ui');
    $('#addPlace').addClass('hidden-ui');
    $('#geolocationBtn').addClass('hidden-ui');
  }

  // @todo refactor this, it's fuckin confusing
  function finishCreateOrUpdatePlace() {
    const updatingMarker = openedMarker;
    openedMarker = null;
    
    goHome();
    showSpinner('Salvando bicicletário...');

    let place = {};

    place.lat = newMarkerTemp.lat;
    place.lng = newMarkerTemp.lng;
    if (newMarkerTemp.address) {
      place.address = newMarkerTemp.address;
    }

    place.text = $('#newPlaceModal #titleInput').val();
    // place.isPublic = $('#newPlaceModal input:radio[name=isPublicRadioGrp]:checked').val();
    place.isPublic = $('#newPlaceModal .acess-types-group .active').data('value') === 'public';
    place.structureType = $('#newPlaceModal .custom-radio-group .active').data('value');
    place.photo = _uploadingPhotoBlob;
    place.description = $('#newPlaceModal #descriptionInput').val();

    const callback = newLocal => {
      // Save cookie to temporarily enable edit/delete of this local
      // Having the cookie isn't enought: the request origin IP is matched with the author IP
      //   saved in the database.
      if (!updatingMarker) {
        BIKE.Session.saveOrUpdatePlaceCookie(newLocal.id);
      }

      Database.getPlaces( () => {
        // @todo we don't need to update the whole DB in this case
        updateMarkers();
        
        hideSpinner();

        if (updatingMarker) {
          swal('Bicicletário atualizado', 'Valeu pela contribuição!', 'success');
        } else { 
          swal({
            title: 'Bicicletário criado',
            text: 'Valeu! Tua contribuição irá ajudar outros ciclistas a encontrar onde deixar a bici e ficar de boa. :)',
            type: 'success',
            allowOutsideClick: false, // because this wouldnt trigger the callback @todo
            allowEscapeKey: false,    // because this wouldnt trigger the callback @todo
          }).then(() => {
            // Clicked OK or dismissed the modal
            const newMarker = markers.find( i => i.id === newLocal.id );
            if (newMarker) {
              openLocal(newMarker, () => {
                promptInstallPopup();

                // $('.rating-input-container').velocity('callout.bounce');
                $('.openReviewPanelBtn').tooltip('show');
                setTimeout(() => { 
                  $('.openReviewPanelBtn').tooltip('hide');
                }, 5000);
              });
            }
          });
        }
      });
    };

    if (updatingMarker) {
      ga('send', 'event', 'Local', 'update', ''+updatingMarker.id);
      Database.updatePlace(updatingMarker.id, place, callback);
    } else {
      ga('send', 'event', 'Local', 'create');
      Database.sendPlace(place, callback);
    }
  } 

  function setupAutocomplete() {
    const inputElem = document.getElementById('locationQueryInput');
    const options = {
      bounds: _mapBounds,
      strictBounds: true
    };
    let autocomplete = new google.maps.places.Autocomplete(inputElem, options);
    // autocomplete.bindTo('bounds', map);

    // var infowindow = new google.maps.InfoWindow();
    _searchResultMarker = new google.maps.Marker({
      map: map,
      clickable: false,
      anchorPoint: new google.maps.Point(0, -29)
    });


    autocomplete.addListener('place_changed', () => {
      // infowindow.close();
      _searchResultMarker.setVisible(false);
      const place = autocomplete.getPlace();
      if (!place.geometry) {
        console.error('Autocomplete\'s returned place contains no geometry');
        return;
      }

      // If the place has a geometry, then present it on a map.
      if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
      } else {
        map.panTo(place.geometry.location);
        map.setZoom(17);  // Why 17? Because it looks good.
      }

      // Custom icon depending on place type
      // _searchResultMarker.setIcon(/** @type {google.maps.Icon} */({
      //   url: place.icon,
      //   size: new google.maps.Size(71, 71),
      //   origin: new google.maps.Point(0, 0),
      //   anchor: new google.maps.Point(17, 34),
      //   scaledSize: new google.maps.Size(35, 35)
      // }));

      _searchResultMarker.setPosition(place.geometry.location);
      _searchResultMarker.setVisible(true);

      ga('send', 'event', 'Search', 'location', place.formatted_address); 

      // var address = '';
      // if (place.address_components) {
      //   address = [
      //               (place.address_components[0] && place.address_components[0].short_name || ''),
      //               (place.address_components[1] && place.address_components[1].short_name || ''),
      //               (place.address_components[2] && place.address_components[2].short_name || '')
      //   ].join(' ');
      // }
      // infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + address);
      // infowindow.open(map, marker);
    });
  }

  function photoUploadCB(e) {
    if (e.target.result) {
      // $('#photoInput + label').fadeOut();
      let canvas = document.createElement('canvas');
      let img = new Image();

      img.onload = () => {
        // Resize image fitting PHOTO_UPLOAD_MAX_W and PHOTO_UPLOAD_MAX_H
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > PHOTO_UPLOAD_MAX_W) {
            height *= PHOTO_UPLOAD_MAX_W / width; 
            width = PHOTO_UPLOAD_MAX_W;
          }
        } else {
          if (height > PHOTO_UPLOAD_MAX_H) {
            width *= PHOTO_UPLOAD_MAX_H / height;
            height = PHOTO_UPLOAD_MAX_H;
          }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        // Save the resized blob
        _uploadingPhotoBlob = canvas.toDataURL('image/jpeg', 0.8);

        // Present to the user the already resized image
        document.getElementById('photoInputBg').src = _uploadingPhotoBlob;
        $('#newPlaceModal #photoInput+label').addClass('photo-input--edit-mode');
      };
      
      img.src = e.target.result;
    }

    hideSpinner();
  }

  function _initTemplates() {
    // Thanks https://stackoverflow.com/questions/8853396/logical-operator-in-a-handlebars-js-if-conditional
    Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
      switch (operator) {
      case '==':
        return (v1 == v2) ? options.fn(this) : options.inverse(this);
      case '===':
        return (v1 === v2) ? options.fn(this) : options.inverse(this);
      case '!=':
        return (v1 != v2) ? options.fn(this) : options.inverse(this);
      case '!==':
        return (v1 !== v2) ? options.fn(this) : options.inverse(this);
      case '<':
        return (v1 < v2) ? options.fn(this) : options.inverse(this);
      case '<=':
        return (v1 <= v2) ? options.fn(this) : options.inverse(this);
      case '>':
        return (v1 > v2) ? options.fn(this) : options.inverse(this);
      case '>=':
        return (v1 >= v2) ? options.fn(this) : options.inverse(this);
      case '&&':
        return (v1 && v2) ? options.fn(this) : options.inverse(this);
      case '&&!':
        return (v1 && !v2) ? options.fn(this) : options.inverse(this);
      case '||':
        return (v1 || v2) ? options.fn(this) : options.inverse(this);
      case '||!':
        return (v1 || !v2) ? options.fn(this) : options.inverse(this);
      default:
        return options.inverse(this);
      } 
    });
 
    templates.placeDetailsModalTemplate = Handlebars.compile($('#placeDetailsModalTemplate').html());
    templates.infoWindowTemplate = Handlebars.compile($('#infoWindowTemplate').html());
    templates.nearestPlacesModalTemplate = Handlebars.compile($('#nearestPlacesModalTemplate').html());
  }

  function validateNewPlaceForm() {
    const textOk = $('#newPlaceModal #titleInput').is(':valid');
    const isOk =
      textOk &&
      // $('#newPlaceModal input:radio[name=isPublicRadioGrp]:checked').val() &&
      $('#newPlaceModal .acess-types-group .active').data('value') &&
      $('#newPlaceModal .custom-radio-group .active').data('value');

    // console.log('validating');

    $('#newPlaceModal #saveNewPlaceBtn').prop('disabled', !isOk);
  }

  // @todo clean up this mess
  function openNewOrEditPlaceModal() {
    // Reset fields
    _uploadingPhotoBlob = '';
    $('#newPlaceModal #saveNewPlaceBtn').prop('disabled', true);
    $('#newPlaceModal #titleInput').val('');
    $('#newPlaceModal .typeIcon').removeClass('active');
    // $('#newPlaceModal input[name=isPublicRadioGrp]').prop('checked',false);
    $('#newPlaceModal #photoInputBg').attr('src', '');
    $('#newPlaceModal #descriptionInput').val('');
    $('#newPlaceModal .description.collapsable').removeClass('expanded');
    
    $('#newPlaceModal #photoInput+label').removeClass('photo-input--edit-mode');
    $('#newPlaceModal h1').html(openedMarker ? 'Editando bicicletário' : 'Novo bicicletário'); 
    $('#newPlaceModal .minimap-container').toggle(!!openedMarker);
    $('#newPlaceModal #cancelEditPlaceBtn').toggle(!!openedMarker);

    // $('#newPlaceModal .tagsContainer button').removeClass('active');

    // Not creating a new one, but editing
    if (openedMarker) {
      // @todo refactor all of this, probably separate into different functions for NEW and EDIT modes
      const m = openedMarker;

      setView('Editar bicicletário', '/editar');

      ga('send', 'event', 'Local', 'update - pending', ''+m.id);

      $('#newPlaceModal #titleInput').val(m.text);
      $('#newPlaceModal #saveNewPlaceBtn').prop('disabled', false);
      $(`#newPlaceModal .custom-radio-group [data-value="${m.structureType}"]`).addClass('active');
      $(`#newPlaceModal .acess-types-group [data-value="${m.isPublic ? 'public' : 'private'}"]`).addClass('active');
      // $(`#newPlaceModal input[name=isPublicRadioGrp][value="${m.isPublic}"]`).prop('checked', true);
      $('#newPlaceModal #photoInputBg').attr('src', m.photo);
      $('#newPlaceModal #descriptionInput').val(m.description);

      // Minimap
      // @todo generalize this
      const staticImgDimensions = _isMobile ? '400x100' : '1000x100';
      const minimapUrl = `https://maps.googleapis.com/maps/api/staticmap?zoom=20&size=${staticImgDimensions}&markers=icon:https://www.bikedeboa.com.br/img/pin_${getPinColorFromAverage(m.average)}.png|${m.lat},${m.lng}&key=${GOOGLEMAPS_KEY}&${_gmapsCustomStyleStaticApi}`;
      $('#newPlaceModal .minimap').attr('src', minimapUrl);

      // More info section
      if (m.description && m.description.length > 0) {
        $('#newPlaceModal .description').addClass('expanded');
      }

      if (openedMarker.photo.length > 0) {
        $('#newPlaceModal #photoInput+label').addClass('photo-input--edit-mode');
      }

      // $('#placeDetailsModal').modal('hide');
    } else {
      setView('Novo bicicletário', '/novo');
      ga('send', 'event', 'Local', 'create - pending');

      initHelpTooltip('#newPlaceModal .help-tooltip-trigger');

      $('#access-general-help-tooltip').off('show.bs.tooltip').on('show.bs.tooltip', () => {
        ga('send', 'event', 'Misc', 'tooltip - new pin access help');
      });
      $('#type-general-help-tooltip').off('show.bs.tooltip').on('show.bs.tooltip', () => {
        ga('send', 'event', 'Misc', 'tooltip - new pin type help');
      });
    }

    // Initialize callbacks
    $('.typeIcon').off('click.radio').on('click.radio', e => {
      $(e.currentTarget).siblings('.typeIcon').removeClass('active');
      $(e.currentTarget).addClass('active');

      // const currentStep = $(e.currentTarget).parent().data('form-step');
      // const nextStep = parseInt(currentStep) + 1;
      // const nextStepEl = $(`[data-form-step="${nextStep}"]`);
      // $('#newPlaceModal').animate({
      //   scrollTop: $(`[data-form-step="${2}"]`).offset().top
      // });

      // $('#newPlaceModal').animate({ 
      //   scrollTop: $(e.currentTarget).parent().offset().top
      // });
    });
    // this has to be AFTER the typeIcon click trigger
    $('#newPlaceModal input, #newPlaceModal .typeIcon')
      .off('change.validate input.validate click.validate')
      .on(' change.validate input.validate click.validate', () => {
        validateNewPlaceForm();
      });
    validateNewPlaceForm();
    
    $('#newPlaceModal textarea').off('keyup').on('keyup', e => {
      autoGrowTextArea(e.currentTarget); 
    });

    $('#saveNewPlaceBtn').off('click').on('click', queueUiCallback.bind(this, finishCreateOrUpdatePlace));

    // Edit only buttons
    if (openedMarker) {
      $('#cancelEditPlaceBtn').off('click').on('click', () => {
        hideAllModals(() => {
          openLocal(openedMarker);
        });
      });

      $('#editPlacePositionBtn').off('click').on('click', () => {
        // Ask to keep opened marker temporarily
        hideAllModals(null, true);
        
        map.setCenter({
          lat: parseFloat(openedMarker.lat),
          lng: parseFloat(openedMarker.lng)
        });

        // Minimum map zoom
        if (map.getZoom() < 19) {
          map.setZoom(19);
        }
        
        toggleLocationInputMode();
      });
    }
    
    $('#photoInput').off('change').on('change', e => {
      // for some weird compiling reason using 'this' doesnt work here
      const self = document.getElementById('photoInput');
      const files = self.files ;

      if (files && files[0] && files[0].type.match(/image.*/)) {
        showSpinner('Processando imagem...');

        queueUiCallback(() => {
          let reader = new FileReader();
          reader.onload = photoUploadCB;
          reader.readAsDataURL(self.files[0]);
        });
      } else {
        swal('Ops', 'Algo deu errado com a foto, por favor tente novamente.', 'error');
      }
    });
    $('.description.collapsable').off('click').on('click', e => {
      $(e.currentTarget).addClass('expanded'); 
    }); 

    // Finally, display the modal
    const showModal = () => {
      $('#newPlaceModal').modal('show');
      // We can only set the nav title after the modal has been opened
      setPageTitle(openedMarker ? 'Editar bicicletário' : 'Novo bicicletário');
    }
    if (openedMarker && $('#placeDetailsModal').is(':visible')) {
      $('#placeDetailsModal')
        .one('hidden.bs.modal', () => { 
          showModal();
        })
        .modal('hide');
    } else {
      showModal();
    }
  }

  function deletePlace() {
    if (openedMarker) {
      swal({
        title: "Deletar bicicletário",
        text: "Tem certeza disso?",
        type: "warning",
        showCancelButton: true,
        confirmButtonText: "Deletar",
        confirmButtonColor: '#FF8265'
      }).then(() => {
        ga('send', 'event', 'Local', 'delete', ''+openedMarker.id);

        showSpinner();
        Database.deletePlace(openedMarker.id, () => {
          goHome();
          Database.getPlaces( () => {
            // @todo we don't need to update the whole DB in this case
            updateMarkers();
            hideSpinner();
            swal('Bicicletário deletado', 'Espero que tu saiba o que tá fazendo. :P', 'error');
          });
        });
      });
    }
  }

  function openReviewModal(prepopedRating) {
    const m = openedMarker;
    const previousReview = BIKE.Session.getReviewFromSession(m.id);
    _updatingReview = previousReview;

    // Tags toggle buttons
    let tagsButtons = tags.map(t => {
      const isPrepoped = previousReview && previousReview.tags.find( (i) => {return parseInt(i.id) === t.id;} );
      return `<button class="btn btn-tag ${isPrepoped ? 'active' : ''}" data-toggle="button" data-value="${t.id}">${t.name}</button>`;
    }).join(''); 

    swal({ 
      // title: 'Avaliar bicicletário',
      customClass: 'review-modal',
      html: `
        <section>
          <div class="review" {{#if pinColor}}data-color={{pinColor}}{{/if}}>
              <h2>Dê sua nota</h2>
              <fieldset class="rating">
                  <input type="radio" id="star5" name="rating" value="5" />
                  <label class="full-star" data-value="5" for="star5" title="De boa!"></label>
                  <input type="radio" id="star4" name="rating" value="4" />
                  <label class="full-star" data-value="4" for="star4" title="Bem bom"></label>
                  <input type="radio" id="star3" name="rating" value="3" />
                  <label class="full-star" data-value="3" for="star3" title="Médio"></label>
                  <input type="radio" id="star2" name="rating" value="2" />
                  <label class="full-star" data-value="2" for="star2" title="Ruim"></label>
                  <input type="radio" id="star1" name="rating" value="1" />
                  <label class="full-star" data-value="1" for="star1" title="Horrivel"></label>
              </fieldset>
          </div>
        </section>

        <section class="step-2">
          <h2>
            Vantagens
          </h2>
          <p class="small">Opcional. Selecione quantas achar necessário.</p>
          <div class="tagsContainer">
              ${tagsButtons}
          </div>
        </section>`,
      confirmButtonText: "Enviar",
      confirmButtonClass: 'btn green sendReviewBtn',
      showCloseButton: true,
      onOpen: () => {
        if(!_isTouchDevice) {
          $('.review-modal .full-star').tooltip({
            toggle: 'tooltip',
            placement: 'bottom',
            'delay': {'show': 0, 'hide': 100}
          });
        }

        // Prepopulate rating
        if (previousReview) {
          currentPendingRating = previousReview.rating;
          $('.review-modal input[name=rating]').val([previousReview.rating]);

          ga('send', 'event', 'Review', 'update - pending', ''+m.id);
        } else if (prepopedRating) {
          currentPendingRating = prepopedRating;
          $('.review-modal input[name=rating]').val([prepopedRating]);
        } else {
          ga('send', 'event', 'Review', 'create - pending', ''+m.id);
        }

        // Init callbacks
        $('.review-modal .rating').off('change').on('change', e => {
          currentPendingRating = $(e.target).val();
          validateReviewForm();
        });

        validateReviewForm();
      }
    }).then(() => {
      sendReviewBtnCB();
    });
  }

  function validateReviewForm() {
    const isOk = currentPendingRating;
    $('.sendReviewBtn').prop('disabled', !isOk);
    // $('.review-modal .step-2').velocity('fadeIn');
  }

  function toggleExpandModalHeader() {
    ga('send', 'event', 'Local', 'photo click', ''+openedMarker.id);

    $('.photo-container').toggleClass('expanded');
  }

  function toggleClearLocationBtn(stateStr) {
    if (stateStr === 'show') {
      $('#clearLocationQueryBtn').addClass('clear-mode');
    } else if (stateStr === 'hide') {
      $('#clearLocationQueryBtn').removeClass('clear-mode');
    } else {
      console.error('Invalid arg in toggleClearLocationBtn()');
    }
  }

  function startConfettis() {
    window.confettiful = new Confettiful(document.querySelector('.confetti-placeholder'));
  }

  function stopConfettis() {
    clearTimeout(window.confettiful.confettiInterval);
  }

  function sendReviewBtnCB() {
    const m = openedMarker;

    const activeTagBtns = $('.review-modal .tagsContainer .btn.active');
    let reviewTags = [];
    for(let i=0; i<activeTagBtns.length; i++) {
      reviewTags.push( {id: ''+activeTagBtns.eq(i).data('value')} );
    }

    showSpinner();

    const reviewObj = {
      placeId: m.id,
      rating: currentPendingRating,
      tags: reviewTags
    };

    const callback = () => {
      Database.sendReview(reviewObj, (reviewId) => {
        // Update internal state
        reviewObj.databaseId = reviewId;
        BIKE.Session.saveOrUpdateReviewCookie(reviewObj);

        // Update screen state
        // $('.review-modal').modal('hide');
        // $('#placeDetailsModal').modal('hide');
        // goHome();

        hideSpinner();
        
        if (_updatingReview) {
          ga('send', 'event', 'Review', 'update', ''+m.id, parseInt(currentPendingRating));

          swal({ 
            title: 'Valeu!',
            html: `Tua avaliação foi atualizada.`,
            type: 'success'
          });
        } else {
          ga('send', 'event', 'Review', 'create', ''+m.id, parseInt(currentPendingRating));

          swal({ 
            title: 'Valeu!',
            html: `Tua avaliação é muito importante! Juntos construímos a cidade que queremos.`,
            type: 'success',
            onOpen: () => {
              startConfettis();
            },
            onClose: () => {
              stopConfettis();

              promptInstallPopup();
            } 
          });
        }

        // Update marker data
        Database.getPlaceDetails(m.id, () => {
          updateMarkers();
          openDetailsModal(m, callback);
        });
      });
    };

    const previousReview = BIKE.Session.getReviewFromSession(m.id);
    if (previousReview) {
      // Delete previous
      Database.deleteReview(previousReview.databaseId, callback);
    } else {
      callback();
    }
  }

  function openRevisionDialog() {
    swal({ 
      // title: 'Sugerir correção',
      customClass: 'revision-modal',
      html:
        `<p>
          Este bicicletário está desatualizado ou está faltando uma informação importante? Aproveite este espaço pra nos ajudar a manter o mapeamento sempre atualizado e útil. :)
        </p>

        <p>
          <textarea id="revisionText" maxlength="250" onload="autoGrowTextArea(this)" 
          onkeyup="autoGrowTextArea(this)" type="text" class="text-input" placeholder="Sua sugestão"></textarea>
        </p>

        <p class="disclaimer">
          Para qualquer comentário sobre o site em geral, lembre que estamos sempre de olho no 
          <a href="mailto:bikedeboa@gmail.com"><span class="glyphicon glyphicon-envelope"></span> 
          email</a> e no <a target="_blank" rel="noopener" href="https://www.facebook.com/bikedeboaapp">Facebook</a>.
        </p>`,
      confirmButtonText: "Enviar",
      showCloseButton: true
    }).then(() => {
      showSpinner();

      const revisionObj = {
        placeId: openedMarker.id,
        content: $('#revisionText').val()
      };

      Database.sendRevision(revisionObj, revisionId => {
        hideSpinner();
        swal('Sugestão enviada', `Obrigado por contribuir com o bike de boa! Sua sugestão será 
          avaliada pelo nosso time de colaboradores o mais rápido possível.`, 'success');
      });
    });
  }

  function enterLocationSearchMode() {
    $('#map, #addPlace, .login-display, #filterBtn, .header__menu-toggle, #geolocationBtn').velocity({ opacity: 0 }, { 'display': 'none' });
  }

  function exitLocationSearchMode() {
    $('#map, #addPlace, .login-display, #filterBtn, .header__menu-toggle, #geolocationBtn').velocity({ opacity: 1 }, { 'display': 'block' });
  }

  function setPageTitle(text) {
    text = text || '';

    // Header that imitates native mobile navbar
    $('#top-mobile-bar-title').text(openedMarker ? '' : text);

    // Basic website metatags
    if (!text || text.length == 0) {
      text = 'bike de boa';
    }
    document.title = text; 
    $('meta[name="og:title"]').attr("content", text);

    // Special metatags for Details View
    if (openedMarker) {
      // Open Graph Picture
      if (openedMarker.photo) {
        $('meta[name="og:image"]').attr("content", openedMarker.photo);
      }

      // Custom Open Graph Description
      if (openedMarker.address) {
        let desc = 'Informações e avaliações deste bicicletário na ';
        desc += openedMarker.address;

        $('meta[name="og:title"]').attr("content", desc);
      }
    }
  }

  function setView(title, view, isReplaceState) {
    _currentView = view;

    if (isReplaceState) {
      History.replaceState({}, title, view);
    } else {
      History.pushState({}, title, view);
    }

    // Force new pageview for Analytics
    // https://developers.google.com/analytics/devguides/collection/analyticsjs/single-page-applications
    ga('set', 'page', view);
    ga('send', 'pageview');
  }

  function goHome() {
    setView('bike de boa', '/');
  }

  function queueUiCallback(callback) {
    if (window.requestAnimationFrame) {
      requestAnimationFrame( () => {
        requestAnimationFrame( () => {
          callback();
        });
      });
    } else {
      callback();
    }
  }

  function returnToPreviousView() {
    if (_isDeeplink) {
      goHome();
    } else {
      History.back();
    }
  }

  function _initGlobalCallbacks() {
    $('#logo').on('click', () => {
      goHome();
    });

    $('.js-menu-show-hamburger-menu').on('click', queueUiCallback.bind(this, () => {
      // Menu open is already triggered inside the menu component.
      ga('send', 'event', 'Misc', 'hamburger menu opened');
      setView('', '/nav');
    }));
    
    $('.js-menu-show-filter-menu').on('click', queueUiCallback.bind(this, () => {
      // Menu open is already triggered inside the menu component.
      ga('send', 'event', 'Filter', 'filter menu opened');
      setView('', '/filtros');
    }));

    $('#show-bike-layer').on('change', e => {
      const $target = $(e.currentTarget);

      if ($target.is(":checked")) {
        ga('send', 'event', 'Filter', 'bike layer - SHOW');
        showBikeLayer();
      } else {
        ga('send', 'event', 'Filter', 'bike layer - HIDE');
        hideBikeLayer();
      }
    });

    $('.facebook-social-link').on('click', () => {
      ga('send', 'event', 'Misc', 'facebook hamburger menu link click');
    });

    $('.instagram-social-link').on('click', () => {
      ga('send', 'event', 'Misc', 'instagram hamburger menu link click');
    });

    $('.github-social-link').on('click', () => {
      ga('send', 'event', 'Misc', 'github hamburger menu link click');
    });

    $('#loginBtn').on('click', queueUiCallback.bind(this, () => {
      _hamburgerMenu.hide();
      setView('Login Administrador', '/login', true);
      login(true);
    }));

    $('#nearestPlacesBtn').on('click', queueUiCallback.bind(this, () => {
      _hamburgerMenu.hide();
      // ga('send', 'event', 'Misc', 'about opened');
      // setView('Sobre', '/sobre', true);
      setView('Mais Próximos', '/maisproximos', true);
    }));

    $('#latestPlacesBtn').on('click', queueUiCallback.bind(this, () => {
      _hamburgerMenu.hide();
      // ga('send', 'event', 'Misc', 'about opened');
      // setView('Sobre', '/sobre', true);
      setView('Mais Recentes', '/recentes', true);
    }));

    $('#bestPlacesBtn').on('click', queueUiCallback.bind(this, () => {
      _hamburgerMenu.hide();
      // ga('send', 'event', 'Misc', 'about opened');
      // setView('Sobre', '/sobre', true);
      setView('Mais Bem Avaliados', '/melhores', true);
    }));

    $('#aboutBtn').on('click', queueUiCallback.bind(this, () => {
      _hamburgerMenu.hide();
      ga('send', 'event', 'Misc', 'about opened');
      setView('Sobre', '/sobre', true);
    }));

    $('#howToInstallBtn').on('click', queueUiCallback.bind(this, () => {
      _hamburgerMenu.hide();
      ga('send', 'event', 'Misc', 'how-to-install opened');
      setView('Como instalar o app', '/como-instalar', true);
    }));

    $('.open-faq-btn').on('click', queueUiCallback.bind(this, () => {
      _hamburgerMenu.hide();
      ga('send', 'event', 'Misc', 'faq opened');
      setView('Perguntas frequentes', '/faq', true);
    }));

    $('.go-to-poa').on('click', queueUiCallback.bind(this, () => {
      map.setCenter(_portoAlegrePos);
      map.setZoom(6);
    }));

    $('#addPlace').on('click', queueUiCallback.bind(this, () => {
      // Make sure the new local modal won't think we're editing a local
      if (!$('#addPlace').hasClass('active')) {
        openedMarker = null;
      }

      ga('send', 'event', 'Local', 'toggle create pin mode');
      toggleLocationInputMode();
    }));

    $('#geolocationBtn').on('click', queueUiCallback.bind(this, () => {
      ga('send', 'event', 'Geolocation', 'geolocate button click');
      geolocate();
    }));

    $('#clear-filters-btn').on('click', () => {
      $('.filter-checkbox:checked').prop('checked', false);

      ga('send', 'event', 'Filter', `clear filters`);
      
      updateFilters();
    });

    $('.filter-checkbox').on('change', e => {
      // ga('send', 'event', 'Misc', 'launched with display=standalone');
      const $target = $(e.currentTarget);

      ga('send', 'event', 'Filter', `${$target.data('prop')} ${$target.data('value')} ${$target.is(":checked") ? 'ON' : 'OFF'}`);

      queueUiCallback(updateFilters);
    });

    $('body').on('click', '.back-button', e => {
      // If was creating a new local
      // @todo Do this check better
      if (_isMobile && History.getState().title === 'Novo bicicletário') {
        swal({
          text: "Tu estava adicionando um bicicletário. Tem certeza que quer descartá-lo?",
          type: "warning",
          showCancelButton: true,
          confirmButtonColor: '#FF8265',
          confirmButtonText: "Descartar", 
          allowOutsideClick: false
        }).then(() => {
          returnToPreviousView();
        }
        );
      } else {
        returnToPreviousView();
      }
    });

    $('body').on('click', '.modal, .close-modal', e => {
      // If click wasn't on the close button or in the backdrop, but in any other part of the modal
      if (e.target != e.currentTarget) {
        return;
      }

      goHome();
    });

    // Modal callbacks
    $('body').on('show.bs.modal', '.modal', e => {
      // Replace bootstrap modal animation with Velocity.js
      // $('.modal-dialog')
      //   .velocity('transition.slideDownBigIn', {duration: MODAL_TRANSITION_IN_DURATION})
      //   .velocity({display: 'table-cell'});

      // Set mobile navbar with modal's title
      const openingModalTitle = $(e.currentTarget).find('.view-name').text();
      if (openingModalTitle) {
        setPageTitle(openingModalTitle)
      }

      // Mobile optimizations
      if (_isMobile) {
        $('#map, #addPlace').addClass('optimized-hidden');
      } else {
        hideUI();

        if ($(e.currentTarget).hasClass('clean-modal')) {
          $('body').addClass('clean-modal-open');
        }
      }
    });
    $('body').on('hide.bs.modal', '.modal', e => {
      // $('.modal-dialog').velocity('transition.slideDownBigOut');

      if (_isMobile) {
        $('#map, #addPlace').removeClass('optimized-hidden');

        // Fix thanks to https://stackoverflow.com/questions/4064275/how-to-deal-with-google-map-inside-of-a-hidden-div-updated-picture
        if (map) {
          google.maps.event.trigger(map, 'resize');
          map.setCenter(map.getCenter());
        }
      } else {
        showUI();
        
        $('body').removeClass('clean-modal-open');
      }
    }); 
    
    $('.promo-banner-container button').on('click', e => {
      $('.promo-banner-container').remove();
      BIKE.Session.setPromoBannerViewed();

      ga('send', 'event', 'Banner', 'promo banner - closed');
    });

    $('.promo-banner-container a').on('click', e => {
      $('.promo-banner-container').remove();
      BIKE.Session.setPromoBannerViewed();

      ga('send', 'event', 'Banner', 'promo banner - link click');
    });

    // Location Search Mode control
    $('#locationQueryInput').on('focus', e => { 
      if (_isMobile) {
        enterLocationSearchMode();
      }
    });
    $('#locationQueryInput').on('blur', e => {
      if (_isMobile) {
        exitLocationSearchMode();
      }
    });

    // Location Search
    $('#locationQueryInput').on('input', queueUiCallback.bind(this, () => {
      toggleClearLocationBtn($('#locationQueryInput').val().length > 0 ? 'show' : 'hide');
    }));

    $('#clearLocationQueryBtn').on('click', queueUiCallback.bind(this, () => {
      // if (_isMobile) {
      //   exitLocationSearchMode();
      // }
      $('#locationQueryInput').val('');
      toggleClearLocationBtn('hide');
      _searchResultMarker.setVisible(false);
    }));

    if (_isMobile) {
      $('#nearbyTabBtn').on('click', () => {
        switchToList();
      });

      $('#mapTabBtn').on('click', () => {
        switchToMap();
      });
    }

    $('#reloadBtn').on('click', () => {
      showSpinner('', () => {
        window.location.reload();
      });
    })
  }

  function switchToList() {
    return new Promise( (resolve, reject) => {
      if (!_currentTab || _currentTab != 'list') {
        _currentTab = 'list';
         
        console.log('list tab');

        $('#bottom-navbar li').removeClass('active');
        $('#nearbyTabBtn').addClass('active');

        // $('#map').velocity('fadeOut', {queue: false});
        $('#map').addClass('hidden');

        hideUI();
        
        queueUiCallback( () => {
          openNearbyPlacesModal();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  function switchToMap() { 
    return new Promise( (resolve, reject) => {
      if (!_currentTab || _currentTab != 'map') {
        _currentTab = 'map';
      
        console.log('map tab'); 

        // $('#list-view').velocity('fadeOut');
        $('#list-view').addClass('hidden'); 

        $('#bottom-navbar li').removeClass('active');
        $('#mapTabBtn').addClass('active');

        queueUiCallback( () => {
          function onReady() {
            // $('#map').velocity('fadeIn', {queue: false});
            $('#map').removeClass('hidden'); 
            
            showUI();
            // $('#locationSearch').velocity('transition.slideDownIn', {delay: 300, queue: false});
            // $('#addPlace').velocity('transition.slideUpIn', {delay: 300, queue: false});
            // $('#map').css('filter', 'none');

            // Fix thanks to https://stackoverflow.com/questions/4064275/how-to-deal-with-google-map-inside-of-a-hidden-div-updated-picture
            google.maps.event.trigger(map, 'resize'); 

            resolve();
          }

          if (!map && !_isOffline) {
            setupGoogleMaps( () => {
              onReady();
              updateMarkers();
            });
          } else {
            onReady();
          }
        });
      } else {
        resolve();
      }
    });
  }

  function hideAllModals(callback, keepOpenedMarker) {
    const $visibleModals = $('.modal').filter(':visible');

    // @todo explain this hack plz
    if (!keepOpenedMarker) {
      openedMarker = null;
    }

    if ($visibleModals.length > 0) {
      $visibleModals
        .one('hidden.bs.modal', () => { 
          if (callback && typeof callback === 'function') {
            callback(); 
          }
        })
        .modal('hide');
    } else {
      if (callback && typeof callback === 'function') {
        callback();
      }
    }

    // Close any sidenavs
    _hamburgerMenu.hide({dontMessWithState: false});
    _filterMenu.hide({dontMessWithState: false});
  }

  function showBikeLayer() {
    map.setOptions({styles: _gmapsCustomStyle_bikeLayerOptimized});
    
    // Bike layer from Google Maps
    _bikeLayer.setMap(map);
    
    // GeoJSON data from #datapoa/EPTC
    map.data.setMap(map);
  }

  function hideBikeLayer() {
    map.setOptions({styles: _gmapsCustomStyle});
    
    _bikeLayer.setMap(null);
    map.data.setMap(null);
  }

  function promptInstallPopup() { 
    // Deferred prompt handling based on:
    //   https://developers.google.com/web/fundamentals/engage-and-retain/app-install-banners/
    if (_deferredPWAPrompt !== undefined) {
      // The user has had a postive interaction with our app and Chrome
      // has tried to prompt previously, so let's show the prompt.
      _deferredPWAPrompt.prompt(); 

      ga('send', 'event', 'Misc', 'beforeinstallprompt - popped');
      e.userChoice.then(function(choiceResult) {
        // console.log(choiceResult.outcome); 
        if(choiceResult.outcome == 'dismissed') {
          // User cancelled home screen install
          ga('send', 'event', 'Misc', 'beforeinstallprompt - refused');
        }
        else {
          // User added to home screen
          ga('send', 'event', 'Misc', 'beforeinstallprompt - accepted');
        }
      });

      _deferredPWAPrompt = false;

      return true;
    } else {
      return false;
    }
  }

  function openHowToInstallModal() {
    const hasNativePromptWorked = promptInstallPopup();

    if (!hasNativePromptWorked) {
      if (_isMobile) {
        // Tries to guess the user agent to initialize the correspondent accordion item opened
        const userAgent = window.getBrowserName();
        switch (userAgent) {
          case 'Chrome':
            $('#collapse-chrome').addClass('in');
            break;
          case 'Firefox':
            $('#collapse-firefox').addClass('in');
            break;
          case 'Safari':
            $('#collapse-safari').addClass('in');
            break;
        }
      }

      // Lazy load gifs when modal is shown
      $('#howToInstallModal .tutorial-gif').each( (i, v) => {
        $(v).attr('src', $(v).data('src'));
      });

      $('#howToInstallModal').modal('show');

      $('#howToInstallModal article > *').css({opacity: 0}).velocity('transition.slideDownIn', { stagger: STAGGER_NORMAL });
    }
  }

  function openFaqModal() {
    $('#faqModal .panel').css({opacity: 0}).velocity('transition.slideDownIn', { stagger: STAGGER_NORMAL });
    $('#faqModal').modal('show');

    $('#faq-accordion').off('show.bs.collapse').on('show.bs.collapse', e => {
      const questionTitle = $(e.target).parent().find('.panel-title').text();
      ga('send', 'event', 'FAQ', 'question opened', questionTitle);
    })
  }

  function openNearbyPlacesModal(order = 'maisproximos') {
    const MAX_PLACES = 50;

    let markersToShow;
    switch (order) {
      case 'maisproximos':
        if (!_userCurrentPosition) {
          showSpinner('Localizando...');
          
          geolocate(true).then(() => {
            hideSpinner();
            
            openNearbyPlacesModal(order);
          }).catch(() => {
            console.error('Cant open nearby places, geolocation failed.');
            
            hideSpinner();
            
            switchToMap();
          }); 
          return;
        }

        // Use nearest places
        for(let i=0; i < markers.length; i++) {
            const m = markers[i];

            m.distance = distanceInKmBetweenEarthCoordinates(
              _userCurrentPosition.lat,
              _userCurrentPosition.lng,
              m.lat,
              m.lng);
        }
        markersToShow = markers.sort((a, b) => {return a.distance - b.distance;});
        markersToShow = markersToShow.slice(0, MAX_PLACES);
        break;
      case 'recentes':
        // Most recently updated places
        // @todo bring this info from getAll endpoint
        markersToShow = markers.sort((a, b) => {return b.updatedAt - a.updatedAt;});
        markersToShow = markersToShow.slice(0, MAX_PLACES);
        break;
      case 'melhores':
        // Best rated places
        markersToShow = markers.sort((a, b) => {
          return (b.average*1000 + b.reviews*1) - (a.average*1000 + a.reviews*1);
        });
        markersToShow = markersToShow.slice(0, MAX_PLACES);
        break;
    }

    // Fill up card info
    let cards = [];
    for(let i=0; i < markersToShow.length; i++) {
        const m = markersToShow[i];

        // Info window
        let templateData = {
          id: m.id,
          title: m.text,
          average: m.average,
          roundedAverage: m.average && ('' + Math.round(m.average)),
          pinColor: getPinColorFromAverage(m.average) 
        };

        // Show distance to place
        if (order === 'maisproximos' && m.distance) {
          if (m.distance < 1) {
            templateData.distance = Math.round(m.distance*1000);
            templateData.distance += 'm';
          } else {
            templateData.distance = m.distance.toFixed(2);
            templateData.distance += 'km';
          }
        }

        templateData.thumbnailUrl = m.photo ? m.photo.replace('images', 'images/thumbs') : '';

        // @todo: encapsulate both the next 2 in one method
        // Reviews count
        if (m.reviews === 0) {
          templateData.numReviews = '';
        } else if (m.reviews === '1') {
          templateData.numReviews = '1 avaliação';
        } else {
          templateData.numReviews = `${m.reviews} avaliações`;
        }

        // Structure and access types
        if (m.isPublic != null) {
          templateData.isPublic = m.isPublic === true; 
        } else {
          templateData.noIsPublicData = true;
        }
        if (m.structureType) {
          templateData.structureTypeLabel = STRUCTURE_CODE_TO_NAME[m.structureType];
        }

        cards.push(templateData);
    }

    // console.log(cards);
    
    ////////////////////////////////
    // Render handlebars template //
    ////////////////////////////////
    if (_isMobile) {
      $('body').addClass('overflow');
      
      $('#list-view').html(templates.nearestPlacesModalTemplate({
        title: order,
        places: cards
      }));

      // $('#list-view').velocity('fadeIn');
      $('#list-view').removeClass('hidden');

      // Animate first 10 elements
      $('#list-view .infobox:nth-child(-n+10)')
        .css({opacity: 0})
        .velocity('transition.slideDownIn', { display: 'flex', stagger: STAGGER_FAST });
    } else {
      $('#nearestPlacesModalPlaceholder').html(templates.nearestPlacesModalTemplate({
        title: order,
        places: cards
      }));
      $('#nearestPlacesModal').modal('show');
    }

    $('.infobox').off('click').on('click', e => {
      const id = $(e.currentTarget).data('id');
      openLocal(getMarkerById(id));
    });
  }

  function handleRouting() { 
    const urlBreakdown = window.location.pathname.split('/');
    let match;

    switch (urlBreakdown[1]) {
      case '':
        if (_isDeeplink) {
          $('body').removeClass('deeplink'); 
          _isDeeplink = false;
        }

        hideAllModals();

        break;
      case 'maisproximos':
      case 'recentes':
      case 'melhores':
        // hideAllModals(() => {
          openNearbyPlacesModal(urlBreakdown[1]);
        // });
        break;
      case 'b':
        if (urlBreakdown[2]) {
          let id = urlBreakdown[2].split('-')[0];
          if (id) {
            id = parseInt(id);
            _deeplinkMarker = getMarkerById(id);
            _openLocal(_deeplinkMarker);
          }
        }

        match = 'b';
        break;
      case 'faq':
        openFaqModal();
        break;
      case 'como-instalar':
        openHowToInstallModal();
        break;
      case 'sobre':
        $('#aboutModal').modal('show');
        $('#aboutModal article > *').css({opacity: 0}).velocity('transition.slideDownIn', { stagger: STAGGER_NORMAL });
        break;
      // case 'nav':
      // case 'filtros':
      //   hideAllModals();
      default:
        // match = false;
        break;
    }

    return match;
  }

  function setupGoogleMaps(callback) {
    $.getScript(
      'https://maps.googleapis.com/maps/api/js?key=AIzaSyD6TeLzQCvWopEQ7hBdbktYsmYI9aNjFc8&libraries=places&language=pt-BR',
      () => {
        $.getScript(
        '/js/lib/infobox.min.js',
        () => {
          setupGoogleMaps2(callback);
        }
      );
      }
    );
  }

  function setupGoogleMaps2(callback) {
  // function setupGoogleMaps(wasDeeplink) {
    let initialCenter;
    if (_deeplinkMarker) {
      initialCenter = {
        lat: parseFloat(_deeplinkMarker.lat),
        lng: parseFloat(_deeplinkMarker.lng)
      }
    } else {
      initialCenter = _portoAlegrePos;
    }

    map = new google.maps.Map(document.getElementById('map'), {
      center: initialCenter,
      zoom: _deeplinkMarker ? 18 : 15,
      disableDefaultUI: true,
      scaleControl: false,
      clickableIcons: false,
      zoomControl: _isDesktop,
      styles: _gmapsCustomStyle,
    });

    _mapBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(_mapBoundsCoords.sw.lat, _mapBoundsCoords.sw.lng),
        new google.maps.LatLng(_mapBoundsCoords.ne.lat, _mapBoundsCoords.ne.lng)
    );

    mapCenterChanged();
    map.addListener('center_changed', mapCenterChanged);

    const infoboxWidth = _isMobile ? $(window).width() * 0.95 : 300;
    const myOptions = {
      maxWidth: 0,
      pixelOffset: new google.maps.Size(-infoboxWidth/2, _isMobile ? 10 : 20),
      disableAutoPan: _isMobile ? false : true,
      zIndex: null,
      boxStyle: {
        width: `${infoboxWidth}px`,
        cursor: 'pointer',
      },
      // closeBoxMargin: '10px 2px 2px 2px',
      closeBoxURL: '',
      infoBoxClearance: new google.maps.Size(1, 1),
      pane: 'floatPane',
      enableEventPropagation: false,
    };
    _infoWindow = new InfoBox(myOptions); 
    
    // Override with custom transition
    // const oldDraw = _infoWindow.draw; 
    // _infoWindow.draw = function() {
    //    oldDraw.apply(this);
    //    $(_infoWindow.div_).velocity('transition.slideUpIn', {display: 'flex', duration: 250}); 
    // }

    google.maps.event.addListener(map, 'zoom_changed', () => {
      const prevZoomLevel = _mapZoomLevel;

      _mapZoomLevel = map.getZoom() <= 13 ? 'mini' : 'full';

      if (prevZoomLevel !== _mapZoomLevel) {
        if (!_activeFilters) {
          setMarkersIcon(_mapZoomLevel);
        }
      }
    });

    geocoder = new google.maps.Geocoder();

    setupAutocomplete();

    // Bike Layer: google maps bycicling layer
    window._bikeLayer = new google.maps.BicyclingLayer();
    
    // Bike layer: GeoJSON from #datapoa
    map.data.map = null;
    map.data.loadGeoJson('/geojson/ciclovias_portoalegre.json');
    map.data.setStyle({
      strokeColor: 'green',
      strokeWeight: 5
    });

    if (navigator.geolocation) {
      if (_geolocationInitialized) {
        // Geolocation might've been initalized without google maps
        if (!_geolocationMarker) {
          initMapsGeolocation();
        }
      }
    }

    if (callback && typeof callback === 'function') {
      callback();
      callback = null;
    }
  }

  function initRouting() {
    const match = handleRouting();

    if (match === 'b') {
      _isDeeplink = true;

      $('body').addClass('deeplink'); 

      // Force branding on mobile topbar
      $('#top-mobile-bar-title').text('bike de boa');

      // Center the map on pin's position
      if (map && _deeplinkMarker) {
        map.setZoom(18);
        map.setCenter({
          lat: parseFloat(_deeplinkMarker.lat),
          lng: parseFloat(_deeplinkMarker.lng)
        });
      }
    } else {
      goHome();
    }
  }

  function updateOnlineStatus(e) {
    _isOffline = !navigator.onLine;    
    $('body').toggleClass('offline', _isOffline);
  }

  // Setup must only be called *once*, differently than init() that may be called to reset the app state.
  function setup() {
    // If permission to geolocation was already granted we already center the map
    if (navigator.geolocation && navigator.permissions) {
      _geolocationPermissionQuery = navigator.permissions.query({'name': 'geolocation'})
      _geolocationPermissionQuery.then( permission => {
        if (permission.state === 'granted') {
          _wasGeolocationPermissionGranted = true;
          ga('send', 'event', 'Geolocation', 'geolocate on startup');
          geolocate(true); 
        }
      });
    }

    // Detect if webapp was launched from mobile homescreen (for Android and iOS)
    // References:
    //   https://developers.google.com/web/updates/2015/10/display-mode
    //   https://stackoverflow.com/questions/21125337/how-to-detect-if-web-app-running-standalone-on-chrome-mobile
    if (navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      $('body').addClass('pwa-installed');
      ga('send', 'event', 'Misc', 'launched with display=standalone');
    }

    // Online Status
    updateOnlineStatus();
    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const isMobileListener = window.matchMedia("(max-width: ${MOBILE_MAX_WIDTH})");
    isMobileListener.addListener((isMobileListener) => {
      _isMobile = isMobileListener.matches;
    });
    const isDesktopListener = window.matchMedia("(min-width: ${DESKTOP_MIN_WIDTH})");
    isDesktopListener.addListener((isDesktopListener) => {
      _isMobile = isDesktopListener.matches;
    });

    // Super specific mobile stuff
    if (_isMobile) {
      $('#locationQueryInput').attr('placeholder','Buscar endereço');

      $('.modal').removeClass('fade');
    } else {
      $('#locationQueryInput').attr('placeholder','Buscar endereço no Rio Grande do Sul'); 
    }

    // User is within Facebook browser.
    // thanks to: https://stackoverflow.com/questions/31569518/how-to-detect-facebook-in-app-browser
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    _isFacebookBrowser = (userAgent.indexOf('FBAN') > -1) || (userAgent.indexOf('FBAV') > -1);


    _initGlobalCallbacks();

    _initTemplates();

    // Bind trigger to history changes
    History.Adapter.bind(window, 'statechange', () => {
      const state = History.getState();
      handleRouting();
    });

    // Initialize router
    _onDataReadyCallback = () => {
      if (window.performance) {
        const timeSincePageLoad = Math.round(performance.now());
        ga('send', 'timing', 'Data', 'data ready', timeSincePageLoad);
      }
      
      // Hide spinner that is initialized visible on CSS
      hideSpinner();

      $('#filter-results-counter').html(markers.length);
      $('#filter-results-total').html(markers.length);

      if (_isOffline) {  
        toastr['info']('Mas fica à vontade, salvamos os bicicletários pra você.', 'Você está offline');
      }

      updateMarkers();
 
      initRouting();

      // @todo please document this shit
      if (_isMobile) {
        // This permission query might take a little longer to answer than all the app initialization
        if (_geolocationPermissionQuery) {
          _geolocationPermissionQuery.then( permission => {
            if (permission.state === 'granted') {
              switchToList();
            } else {
              switchToMap();
            }
          });
        } else {
          switchToMap();
        }
      } else { 
        switchToMap();
      }
    };

    // Set up Sweet Alert
    swal.setDefaults({
      confirmButtonColor: '#30bb6a',
      confirmButtonText: 'OK',
      confirmButtonColor: '#b3b3b3',
      confirmButtonClass: 'btn green',
      cancelButtonText: 'Cancelar',
      cancelButtonClass: 'btn',
      buttonsStyling: false,
      allowOutsideClick: true
    });
 
    // Toastr options
    toastr.options = {
      'positionClass': _isMobile ? 'toast-bottom-center' : 'toast-bottom-left',
      'closeButton': false,
      'progressBar': false,
    }

    const sidenavHideCallback = () => {
      // @todo explain me
      setView('bike de boa', '/', true);
    };

    _hamburgerMenu = new SideNav(
      'hamburger-menu',
      {
        hideCallback: sidenavHideCallback
      }
    );
    _filterMenu = new SideNav(
      'filter-menu',
      {
        inverted: true,
        hideCallback: sidenavHideCallback
        /*fixed: true*/
      }
    );

    initHelpTooltip('#filter-menu .help-tooltip-trigger');

    $('#ciclovias-help-tooltip').off('show.bs.tooltip').on('show.bs.tooltip', () => {
      ga('send', 'event', 'Misc', 'tooltip - ciclovias');
    });

    // Intercepts Progressive Web App event
    // source: https://developers.google.com/web/fundamentals/engage-and-retain/app-install-banners/
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      _deferredPWAPrompt = e;

      $('#howToInstallBtn').css({'font-weight': 'bold'});

      return false;
    });
  }

  function handleLoggedUser() {
    // Setup little user label underneath the location search bar
    $('#locationSearch').append('<span class="login-display logged"><span class="glyphicon glyphicon-user"></span>'+loggedUser+'<button>✕</button></span>');
    $('.login-display button').off('click').on('click', () => {
      Cookies.remove('bikedeboa_user');
      window.location.reload();
    });
  }

  function login(isUserLogin = false) {
    Database.authenticate(isUserLogin, () => {
      if (loggedUser) {
        handleLoggedUser();
      }

      Database.getAllTags();
    });
  }

  function localhostOverrides() {
    // if (_isLocalhost) {
    //   Database.API_URL = 'http://localhost:3000';
    // }
  }

  function init() {
    if (isDemoMode) {
      Database = BIKE.MockedDatabase;
    } else {
      Database = BIKE.Database;
    }

    localhostOverrides();

    // Retrieve markers saved in a past access
    markers = BIKE.getMarkersFromLocalStorage();
    if (markers && markers.length) {
      console.log(`Retrieved ${markers.length} locations from LocalStorage.`);

      if (_onDataReadyCallback && typeof _onDataReadyCallback === 'function') {
        _onDataReadyCallback();
        _onDataReadyCallback = null;
      }
    } 

    if (_isOffline) {
      hideSpinner();
    } else {
      // Use external service to get user's IP
      $.getJSON('//ipinfo.io/json', data => {
        if (data && data.ip) {
          ga('send', 'event', 'Misc', 'IP retrival OK', ''+data.ip);
          Database._setOriginHeader(data.ip);
        } else {
          console.error('Something went wrong when trying to retrieve user IP.');
          ga('send', 'event', 'Misc', 'IP retrieval error');
        }

        // Coords via IP
        // if (data && data.loc) {
        //   const coords = data.loc.split(',');
        //   const pos = {
        //     lat: parseFloat(coords[0]),
        //     lng: parseFloat(coords[1])
        //   };
        //   map.panTo(pos);
        // }
      });

      // Authenticate to be ready for next calls
      login();

      // This is the only request allowed to be unauthenticated
      Database.getPlaces( () => {
        updateMarkers();

        if (_onDataReadyCallback && typeof _onDataReadyCallback === 'function') {
          _onDataReadyCallback();
          _onDataReadyCallback = null;
        }
      });
    }

    // Promo banner
    if (!BIKE.Session.getPromoBannerViewed()) {
      setTimeout( () => {
        if (_isMobile) {
          $('.promo-banner-container').show();
        } else {
          $('.promo-banner-container').velocity('fadeIn', { duration: 3000 });
        }
      }, 2000); 
    }
  }

  window.toggleDemoMode = () => {
    showSpinner();
    isDemoMode = !isDemoMode;
    init();
  };

  //////////////////////////
  // Start initialization //
  //////////////////////////

  setup(); 
  init();
});
