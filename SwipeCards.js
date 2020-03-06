/* Gratefully copied from https://github.com/brentvatne/react-native-animated-demo-tinder */
'use strict';

import React, { Component, } from 'react';
import PropTypes from 'prop-types';

import {
  StyleSheet,
  Text,
  View,
  Animated,
  PanResponder,
  Dimensions,
  Image,
  Easing
} from 'react-native';

import clamp from 'clamp';

import Defaults from './Defaults.js';

const viewport = Dimensions.get('window')
const SWIPE_THRESHOLD = 120;
let widthscreen = Dimensions.get('window').width;
let heightscreen = Dimensions.get('screen').height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  yup: {
    borderColor: 'green',
    borderWidth: 2,
    position: 'absolute',
    padding: 20,
    bottom: 20,
    borderRadius: 5,
    right: 0,
  },
  yupText: {
    fontSize: 16,
    color: 'green',
  },
  maybe: {
    borderColor: 'blue',
    borderWidth: 2,
    position: 'absolute',
    padding: 20,
    bottom: 20,
    borderRadius: 5,
    right: 20,
  },
  maybeText: {
    fontSize: 16,
    color: 'blue',
  },
  nope: {
    borderColor: 'red',
    borderWidth: 2,
    position: 'absolute',
    bottom: 20,
    padding: 20,
    borderRadius: 5,
    left: 0,
  },
  nopeText: {
    fontSize: 16,
    color: 'red',
  },
});

//Components could be unloaded and loaded and we will loose the users currentIndex, we can persist it here.
let currentIndex = {};
let guid = 0;

export default class SwipeCards extends Component {

  static propTypes = {
    cards: PropTypes.array,
    cardKey: PropTypes.string,
    hasMaybeAction: PropTypes.bool,
    loop: PropTypes.bool,
    onLoop: PropTypes.func,
    allowGestureTermination: PropTypes.bool,
    stack: PropTypes.bool,
    stackGuid: PropTypes.string,
    stackDepth: PropTypes.number,
    stackOffsetX: PropTypes.number,
    stackOffsetY: PropTypes.number,
    renderNoMoreCards: PropTypes.func,
    showYup: PropTypes.bool,
    showMaybe: PropTypes.bool,
    showNope: PropTypes.bool,
    handleYup: PropTypes.func,
    handleMaybe: PropTypes.func,
    handleNope: PropTypes.func,
    yupText: PropTypes.string,
    yupView: PropTypes.element,
    maybeText: PropTypes.string,
    maybeView: PropTypes.element,
    nopeText: PropTypes.string,
    noView: PropTypes.element,
    onClickHandler: PropTypes.func,
    renderCard: PropTypes.func,
    cardRemoved: PropTypes.func,
    dragY: PropTypes.bool,
    smoothTransition: PropTypes.bool,
    isShell: PropTypes.bool
  };
  static defaultProps = {
    cards: [],
    cardKey: 'key',
    hasMaybeAction: false,
    loop: false,
    onLoop: () => null,
    allowGestureTermination: true,
    stack: false,
    stackDepth: 3,
    stackOffsetX: 25,
    stackOffsetY: 0,
    showYup: true,
    showMaybe: true,
    showNope: true,
    handleYup: (card) => null,
    handleMaybe: (card) => null,
    handleNope: (card) => null,
    nopeText: "Nope!",
    maybeText: "Maybe!",
    yupText: "Yup!",
    onClickHandler: () => {

    },
    onDragStart: () => {
    },
    onDragRelease: () => { },
    cardRemoved: (ix) => null,
    renderCard: (card) => null,
    lodingHide: () => {
    },
    style: styles.container,
    dragY: true,
    smoothTransition: false,
    isShell: false,
  };

  constructor(props) {
    super(props);

    //Use a persistent variable to track currentIndex instead of a local one.
    this.guid = this.props.guid || guid++;
    if (!currentIndex[this.guid]) currentIndex[this.guid] = 0;

    this.state = {
      pan: new Animated.ValueXY(0),
      enter: new Animated.Value(1),
      cards: [].concat(this.props.cards),
      card: this.props.cards[currentIndex[this.guid]],
      moveX: 0,
      moveY: 0,
    };

    this.lastX = 0;
    this.lastY = 0;
    this.moveX = 0;
    this.moveY = 0;

    this.cardAnimation = null;

    this._panResponder = PanResponder.create({
      onStartShouldSetResponderCapture: (evt) => true,
      onMoveShouldSetResponderCapture: (evt) => true,
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onShouldBlockNativeResponder: (evt, gestureState) => {
        return false;
      },
      onPanResponderGrant: (e, gestureState) => {

        this.props.lodingHide();
        this.state.pan.setOffset({ x: this.state.pan.x._value, y: this.state.pan.y._value });
        this.state.pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderTerminationRequest: (evt, gestureState) => this.props.allowGestureTermination,
      onPanResponderMove: (e, gestureState) => {
        const { dx, dy } = gestureState;
        this.moveX = dx;
        this.moveY = dy;
        this.state.pan.setValue({ x: dx, y: dy });
      },
      onPanResponderRelease: (e, { vx, vy, dx, dy }) => {
        this.props.onDragRelease()
        this.state.pan.flattenOffset();
        let velocity = 1;
        if (Math.abs(dx) <= 5 && Math.abs(dy) <= 5) {
          this.props.onClickHandler(this.state.card)
          return
        }
        this.moveY = dy;

        if (dx < -180 || (vx < -0.5 && dx < 0)) {
          this.myStart(true);
          setTimeout(() => {
            this.props.handleNope(this.state.card)
            this.state.pan.setValue({ x: 0, y: 0 });
            this.props.cardRemoved(currentIndex[this.guid]);
            this._advanceState();
          }, 300);
        } else if (dx > 180 || (vx > 0.3 && dx > 0)) {
          this.myStart();
          setTimeout(() => {
            this.props.handleYup(this.state.card)
            this.state.pan.setValue({ x: 0, y: 0 });
            this.props.cardRemoved(currentIndex[this.guid]);
            this._advanceState(true);
          }, 300);
        } else {
          this._resetPan();
        }

      }
    });
  }
  _forceLeftSwipe() {
    this.cardAnimation = Animated.timing(this.state.pan, {
      toValue: { x: -500, y: 0 },
    }).start(status => {
      if (status.finished) this._advanceState(false);
      else this._resetState();
      this.cardAnimation = null;
    });
    this.props.cardRemoved(currentIndex[this.guid]);
  }
  _forceUpSwipe() {
    this.cardAnimation = Animated.timing(this.state.pan, {
      toValue: { x: 0, y: 500 },
    }).start(status => {
      if (status.finished) this._advanceState(false);
      else this._resetState();
      this.cardAnimation = null;
    }
    );
    this.props.cardRemoved(currentIndex[this.guid]);
  }

  _forceRightSwipe() {
    this.cardAnimation = Animated.timing(this.state.pan, {
      toValue: { x: 500, y: 0 },
    }).start(status => {
      if (status.finished) this._advanceState(true);
      else this._resetState();

      this.cardAnimation = null;
    }
    );
    this.props.cardRemoved(currentIndex[this.guid]);
  }

  _goToNextCard() {
    currentIndex[this.guid]++;
    if (currentIndex[this.guid] > this.state.cards.length - 1 && this.props.loop) {
      this.props.onLoop();
      currentIndex[this.guid] = 0;
    }
    this.setState({
      card: this.state.cards[currentIndex[this.guid]]
    });
  }

  _goToPrevCard() {
    currentIndex[this.guid]--;
    if (currentIndex[this.guid] < 0) {
      currentIndex[this.guid] = 0;
    }
    this.setState({
      card: this.state.cards[currentIndex[this.guid]]
    });
  }

  componentDidMount() {
  }



  componentWillReceiveProps(nextProps) {
    if (nextProps.cards !== this.props.cards) {
      if (this.cardAnimation) {
        this.cardAnimation.stop();
        this.cardAnimation = null;
      }
      this.setState({
        cards: [].concat(nextProps.cards),
        card: nextProps.cards[currentIndex[this.guid]]
      });
    }
  }
  _resetPan() {
    Animated.timing(
      this.state.pan,
      {
        toValue: { x: 0, y: 0 },
        duration: 400,
        easing: Easing.linear
      }
    ).start(() => { });
  }
  myStart(type) {
    Animated.timing(
      this.state.pan,
      {
        toValue: type ? { x: -(widthscreen * 2), y: this.moveY > 0 ? this.moveY + 300 : this.moveY - 300 } : { x: (widthscreen * 2), y: this.moveY > 0 ? this.moveY + 300 : this.moveY - 300 },
        duration: 400,
        easing: Easing.linear
      }
    ).start(() => { });
  }
  _resetState() {
    this.state.pan.setValue({ x: 0, y: 0 });
    this.state.enter.setValue(0);
    this._animateEntrance();
  }
  _animateEntrance() {
    Animated.timing(
      this.state.enter,
      { toValue: 1, duration: 300, }
    ).start();
  }
  _advanceState(isRight) {
    this.state.pan.setValue({ x: 0, y: 0 });
    // this.state.enter.setValue(0);
    Animated.timing(
      this.state.enter,
      { toValue: 0, duration: 1000 }
    ).start(() => {
    });
    this._animateEntrance();
    if (isRight) {
      this._goToPrevCard();
    } else {
      if (currentIndex[this.guid] >= this.state.cards.length - 1) {
        return
      }
      this._goToNextCard();
    }
  }

  /**
   * Returns current card object
   */
  getCurrentCard() {
    return this.state.cards[currentIndex[this.guid]];
  }

  renderNoMoreCards() {
    if (this.props.renderNoMoreCards) {
      return this.props.renderNoMoreCards();
    }

    return <Defaults.NoMoreCards />;
  }

  /**
   * Renders the cards as a stack with props.stackDepth cards deep.
   */
  renderStack() {


    //Get the next stack of cards to render.
    let cards = this.state.cards.slice(currentIndex[this.guid], currentIndex[this.guid] + this.props.stackDepth).reverse();

    return cards.map((card, i) => {
      let offsetX = 20;
      if (this.props.isShell) {
        offsetX = this.props.stackOffsetX * cards.length - i * this.props.stackOffsetX;
      }
      let lastOffsetX = (offsetX + this.props.stackOffsetX);
      let offsetY = 0;
      if (this.props.isShell) {
        offsetY = this.props.stackOffsetY * cards.length - i * this.props.stackOffsetY;
      } else {
        if (this.state.cards.length - 1 - currentIndex[this.guid] <= 1) {
          offsetY = 30 * cards.length - i * 30;
        } else {
          offsetY = this.props.stackOffsetY * cards.length - i * this.props.stackOffsetY;
        }
      }
      let lastOffsetY = 0;
      if (this.props.isShell) {
        lastOffsetY = offsetY + this.props.stackOffsetY;
      } else {
        lastOffsetY = this.props.stackOffsetY;
      }
      // let opacity = 0.25 + (0.75 / cards.length) * (i + 1);
      let opacity = 1;
      let lastOpacity = 0.25 + (0.75 / cards.length) * i;

      let scale = 0.85 + (0.15 / cards.length) * (i + 1);
      let lastScale = 0.85 + (0.15 / cards.length) * i;

      let style = {
        position: 'absolute',
        top: this.state.enter.interpolate({ inputRange: [0, 1], outputRange: [lastOffsetY, offsetY] }),
        left: this.state.enter.interpolate({ inputRange: [0, 1], outputRange: [lastOffsetX, offsetX] }),
        opacity: 1,
        // opacity: this.props.smoothTransition ? 1 : this.state.enter.interpolate({ inputRange: [0, 1], outputRange: [lastOpacity, opacity] }),
        transform: [{ scale: this.state.enter.interpolate({ inputRange: [0, 1], outputRange: [lastScale, scale] }) }],
        elevation: i * 10
      };

      //Is this the top card?  If so animate it and hook up the pan handlers.
      if (i + 1 === cards.length) {
        let { pan, moveX, moveY } = this.state;
        let [translateX, translateY] = [pan.x, pan.y];

        let rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ["-30deg", "0deg", "30deg"] });
        let opacity = this.props.smoothTransition ? 1 : pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: [0.5, 1, 0.5] });

        let animatedCardStyles = {
          ...style,
          // top: moveY,
          // left: moveX,
          transform: [
            { translateX: translateX },
            { translateY: translateY },
            // { rotate: rotate },
            // { scale: this.state.enter.interpolate({ inputRange: [0, 1], outputRange: [lastScale, scale] }) }
          ]
        };

        return <Animated.View key={i} style={[styles.card, animatedCardStyles]} {... this._panResponder.panHandlers}>
          {this.props.renderCard(this.state.card)}
        </Animated.View>;
      }

      return <Animated.View key={i} style={style}>{this.props.renderCard(card)}</Animated.View>;
    });
  }

  renderCard() {
    if (!this.state.card) {
      return this.renderNoMoreCards();
    }

    let { pan, enter } = this.state;
    let [translateX, translateY] = [pan.x, pan.y];

    let rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ["-30deg", "0deg", "30deg"] });
    // let opacity = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: [0.5, 1, 0.5] });
    let opacity = 1;
    let scale = enter;

    let animatedCardStyles = { transform: [{ translateX }, { translateY }, { rotate }, { scale }], opacity };

    return <Animated.View key={"top"} style={[styles.card, animatedCardStyles]} {... this._panResponder.panHandlers}>
      {this.props.renderCard(this.state.card)}
    </Animated.View>;
  }

  renderNope() {
    let { pan } = this.state;

    // let nopeOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, -(SWIPE_THRESHOLD / 2)], outputRange: [1, 0], extrapolate: 'clamp' });
    let nopeOpacity = 1;
    let nopeScale = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    let animatedNopeStyles = { transform: [{ scale: nopeScale }], opacity: nopeOpacity };

    if (this.props.renderNope) {
      return this.props.renderNope(pan);
    }

    if (this.props.showNope) {

      const inner = this.props.noView
        ? this.props.noView
        : <Text style={[styles.nopeText, this.props.nopeTextStyle]}>{this.props.nopeText}</Text>

      return <Animated.View style={[styles.nope, this.props.nopeStyle, animatedNopeStyles]}>
        {inner}
      </Animated.View>;
    }

    return null;
  }

  renderMaybe() {
    if (!this.props.hasMaybeAction) return null;

    let { pan } = this.state;

    let maybeOpacity = pan.y.interpolate({ inputRange: [-SWIPE_THRESHOLD, -(SWIPE_THRESHOLD / 2)], outputRange: [1, 0], extrapolate: 'clamp' });
    let maybeScale = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD], outputRange: [0, 1, 0], extrapolate: 'clamp' });
    let animatedMaybeStyles = { transform: [{ scale: maybeScale }], opacity: maybeOpacity };

    if (this.props.renderMaybe) {
      return this.props.renderMaybe(pan);
    }


    if (this.props.showMaybe) {

      const inner = this.props.maybeView
        ? this.props.maybeView
        : <Text style={[styles.maybeText, this.props.maybeTextStyle]}>{this.props.maybeText}</Text>

      return <Animated.View style={[styles.maybe, this.props.maybeStyle, animatedMaybeStyles]}>
        {inner}
      </Animated.View>;
    }

    return null;
  }

  renderYup() {
    let { pan } = this.state;

    let yupOpacity = pan.x.interpolate({ inputRange: [(SWIPE_THRESHOLD / 2), SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
    let yupScale = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0.5, 1], extrapolate: 'clamp' });
    let animatedYupStyles = { transform: [{ scale: yupScale }], opacity: yupOpacity };

    if (this.props.renderYup) {
      return this.props.renderYup(pan);
    }

    if (this.props.showYup) {

      const inner = this.props.yupView
        ? this.props.yupView
        : <Text style={[styles.yupText, this.props.yupTextStyle]}>{this.props.yupText}</Text>;

      return <Animated.View style={[styles.yup, this.props.yupStyle, animatedYupStyles]}>
        {inner}
      </Animated.View>;
    }

    return null;
  }

  render() {
    return (
      <View style={styles.container}>
        {this.props.stack ? this.renderStack() : this.renderCard()}
        {/* {this.renderNope()} */}
        {/* {this.renderMaybe()} */}
        {/* {this.renderYup()} */}
      </View>
    );
  }
}
