"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var core_1 = require('@angular/core');
var Subject_1 = require('rxjs/Subject');
var debounceTime_1 = require('rxjs/operator/debounceTime');
var ng2_map_1 = require('../services/ng2-map');
var ng2_map_component_1 = require('./ng2-map.component');
var INPUTS = [
    'position'
];
var OUTPUTS = [
    'animationChanged', 'click', 'clickableChanged', 'cursorChanged', 'dblclick', 'drag', 'dragend', 'draggableChanged',
    'dragstart', 'flatChanged', 'iconChanged', 'mousedown', 'mouseout', 'mouseover', 'mouseup', 'positionChanged', 'rightclick',
    'shapeChanged', 'titleChanged', 'visibleChanged', 'zindexChanged',
    //to avoid DOM event conflicts
    'map_click', 'map_mouseover', 'map_mouseout', 'map_mouseup', 'map_mousedown', 'map_drag', 'map_dragend'
];
/**
 * Wrapper to a create extend OverlayView at runtime, only after google maps is loaded.
 * Otherwise throws a google is unknown error.
 */
function getCustomMarkerOverlayView(htmlEl, position) {
    var CustomMarkerOverlayView = (function (_super) {
        __extends(CustomMarkerOverlayView, _super);
        function CustomMarkerOverlayView(htmlEl, position) {
            var _this = this;
            _super.call(this);
            this.visible = true;
            this.setPosition = function (position) {
                _this.htmlEl.style.visibility = 'hidden';
                if (position.constructor.name === "Array") {
                    _this.position = new google.maps.LatLng(position[0], position[1]);
                }
                else if (typeof position === 'string') {
                    var geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ address: position }, function (results, status) {
                        if (status === google.maps.GeocoderStatus.OK) {
                            console.log('setting custom marker position from address', position);
                            _this.setPosition(results[0].geometry.location);
                        }
                        else {
                            console.log('Error in custom marker geo coding, position');
                        }
                    });
                }
                else if (position && typeof position.lng == 'function') {
                    _this.position = position;
                }
                if (_this.getProjection() && typeof _this.position.lng == 'function') {
                    var positionOnMap_1 = function () {
                        var posPixel = _this.getProjection().fromLatLngToDivPixel(_this.position);
                        var x = Math.round(posPixel.x - (_this.htmlEl.offsetWidth / 2));
                        var y = Math.round(posPixel.y - _this.htmlEl.offsetHeight / 2);
                        _this.htmlEl.style.left = x + 'px';
                        _this.htmlEl.style.top = y + 'px';
                        _this.htmlEl.style.visibility = 'visible';
                    };
                    if (_this.htmlEl.offsetWidth && _this.htmlEl.offsetHeight) {
                        positionOnMap_1();
                    }
                    else {
                        setTimeout(function () { return positionOnMap_1(); });
                    }
                }
            };
            this.htmlEl = htmlEl;
            this.position = position;
        }
        CustomMarkerOverlayView.prototype.onAdd = function () {
            this.getPanes().overlayMouseTarget.appendChild(this.htmlEl);
            // required for correct display inside google maps container
            this.htmlEl.style.position = 'absolute';
        };
        CustomMarkerOverlayView.prototype.draw = function () {
            this.setPosition(this.position);
            this.setZIndex(this.zIndex);
            this.setVisible(this.visible);
        };
        CustomMarkerOverlayView.prototype.onRemove = function () {
            //
        };
        CustomMarkerOverlayView.prototype.getPosition = function () {
            return this.position;
        };
        ;
        CustomMarkerOverlayView.prototype.setZIndex = function (zIndex) {
            zIndex && (this.zIndex = zIndex); /* jshint ignore:line */
            this.htmlEl.style.zIndex = this.zIndex;
        };
        CustomMarkerOverlayView.prototype.setVisible = function (visible) {
            this.htmlEl.style.display = visible ? 'inline-block' : 'none';
            this.visible = visible;
        };
        ;
        return CustomMarkerOverlayView;
    }(google.maps.OverlayView));
    return new CustomMarkerOverlayView(htmlEl, position);
}
var CustomMarker = (function () {
    function CustomMarker(ng2MapComponent, elementRef, ng2Map) {
        var _this = this;
        this.ng2MapComponent = ng2MapComponent;
        this.elementRef = elementRef;
        this.ng2Map = ng2Map;
        this.initialized$ = new core_1.EventEmitter();
        this.inputChanges$ = new Subject_1.Subject();
        this.elementRef.nativeElement.style.display = 'none';
        OUTPUTS.forEach(function (output) { return _this[output] = new core_1.EventEmitter(); });
    }
    // Initialize this map object when map is ready
    CustomMarker.prototype.ngOnInit = function () {
        var _this = this;
        if (this.ng2MapComponent.mapIdledOnce) {
            this.initialize();
        }
        else {
            this.ng2MapComponent.mapReady$.subscribe(function (map) { return _this.initialize(); });
        }
    };
    CustomMarker.prototype.ngOnChanges = function (changes) {
        this.inputChanges$.next(changes);
    };
    CustomMarker.prototype.ngOnDestroy = function () {
        var _this = this;
        this.ng2MapComponent.removeFromMapObjectGroup('CustomMarker', this.mapObject);
        if (this.mapObject) {
            OUTPUTS.forEach(function (output) { return google.maps.event.clearListeners(_this.mapObject, output); });
            this.mapObject.setMap(null);
            delete this.mapObject;
        }
    };
    CustomMarker.prototype.initialize = function () {
        var _this = this;
        console.log('custom-marker is being initialized');
        this.el = this.elementRef.nativeElement;
        this.mapObject = getCustomMarkerOverlayView(this.el, this['position']);
        this.mapObject.setMap(this.ng2MapComponent.map);
        // set google events listeners and emits to this outputs listeners
        this.ng2Map.setObjectEvents(OUTPUTS, this, 'mapObject');
        // update object when input changes
        debounceTime_1.debounceTime.call(this.inputChanges$, 1000)
            .subscribe(function (changes) { return _this.ng2Map.updateGoogleObject(_this.mapObject, changes); });
        this.ng2MapComponent.addToMapObjectGroup('CustomMarker', this.mapObject);
        this.initialized$.emit(this.mapObject);
    };
    CustomMarker.decorators = [
        { type: core_1.Component, args: [{
                    selector: 'ng2-map > custom-marker',
                    inputs: INPUTS,
                    outputs: OUTPUTS,
                    template: "\n    <ng-content></ng-content>\n  ",
                },] },
    ];
    /** @nocollapse */
    CustomMarker.ctorParameters = function () { return [
        { type: ng2_map_component_1.Ng2MapComponent, },
        { type: core_1.ElementRef, },
        { type: ng2_map_1.Ng2Map, },
    ]; };
    CustomMarker.propDecorators = {
        'initialized$': [{ type: core_1.Output },],
    };
    return CustomMarker;
}());
exports.CustomMarker = CustomMarker;
//# sourceMappingURL=custom-marker.js.map