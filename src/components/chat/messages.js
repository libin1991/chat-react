import React, {Component} from 'react';
import PropTypes from 'prop-types';
import timeago from 'timeago.js';
import './style.css';
import {emojis} from './icon';
import {dateFormat} from './utils';
import errorIcon from './emoji-img/error.png';

const re = /\[[\u4e00-\u9fa5-\w-\d]+\]/g;
let lastDom;
let firstDom;
let isUnshift;
let unshiftLastTimestamp;
let setScrollTop = true;
let messageLength;

export default class ChatInput extends Component {
  static propTypes = {
    dataSource: PropTypes.array,
    loading: PropTypes.bool,
    scrolltoupper: PropTypes.func,
    avatarClick: PropTypes.func,
    timestamp: PropTypes.number,
    timeBetween: PropTypes.number,
    timeagoMax: PropTypes.number,
    loader: PropTypes.node
  };
  state = {
    betweenTime: 1000 * 60,
    maxTimeago: 1000 * 60 * 60,
  }
  componentDidMount() {
    window.addEventListener('scroll', this.onScroll);
    // window.onscroll = () => {
    //   const {loading, scrolltoupper} = this.props;
    //   if (window.pageYOffset === 0 && !loading) {
    //     scrolltoupper && scrolltoupper();
    //   }
    // };
    const {offsetTop} = this.refs[lastDom];
    window.scrollTo(0, offsetTop);
  }
  onScroll = (e) => {
    const {loading, scrolltoupper} = this.props;
    if (window.pageYOffset === 0 && !loading) {
      scrolltoupper && scrolltoupper();
    }
  }
  shouldComponentUpdate(nextProps, nextState) {
    const {dataSource: nextDataSource, loading: nextLoading, timestamp: nextTimestamp} = nextProps;
    const {dataSource, loading, timestamp} = this.props;
    const dataSourcehasChange = nextDataSource.length !== messageLength;
    setScrollTop = dataSourcehasChange;
    if (timestamp !== nextTimestamp) {
      return true;
    } else if (loading !== nextLoading) {
      return true;
    }
    return false;
  }
  componentDidUpdate() {
    const {offsetTop} = this.refs[lastDom];
    if (setScrollTop) {
      setScrollTop = false;
      window.scrollTo(0, offsetTop);
    }
  }
  componentWillUnmount() {
    window.removeEventListener('scroll', this.onScroll);
  }
  userAvatarClick = (value) => {
    const {avatarClick} = this.props;
    avatarClick && avatarClick(value);
  }
  loaderContent = () => (<div className="loadEffect">
    <span /><span /><span /><span /><span /><span /><span /><span />
  </div>)
  renderMessageList = (data) => {
    // timeBetween ---- 分钟单位
    // timeagoMax ----- 小时单位
    const {timeBetween = 5, timeagoMax = (24 * 3)} = this.props;
    messageLength = data.length;
    const {userInfo: {userId: ownUserId, avatar: ownAvatar, name: ownName} = {}} = this.props;
    let {maxTimeago, betweenTime} = this.state;
    const timeagoInstance = timeago();
    maxTimeago *= timeagoMax;
    betweenTime *= timeBetween;
    //12132312
    let startTimeStamp = 0;
    // setScrollTop = true;
    return data.map((item, itemIndex) => {
      const {
        timestamp, value, userInfo = {}, error
      } = item;
      const {avatar, userId, name} = userInfo;
      const split = value.split(re);
      const found = value.match(re);
      const search = value.search(re);

      let timeInfoNode = '';
      if ((timestamp - startTimeStamp) > betweenTime) {
        timeInfoNode = (new Date().getTime() - timestamp) < maxTimeago ?
          <p className="time-info"><span>{timeagoInstance.format(timestamp, 'zh_CN')}</span></p> :
          <p className="time-info"><span>{dateFormat(timestamp, 'MM月dd hh:mm')}</span></p>;
      }
      startTimeStamp = timestamp;
      // this.setState({startTimeStamp: timestamp});
      const concatChat = [];
      split.forEach(v => {
        const emojiText = ((found || []).shift() || '').replace(/(\[|\])+/g, '');
        if (v) {
          concatChat.push({type: 'text', value: v});
        }
        emojiText && concatChat.push({type: 'emoji', value: emojiText});
      });
      console.log(concatChat);
      const content = concatChat.map((v, index) => {
        const {type, value: chatValue} = v || {};
        switch (type) {
          case 'text':
            return chatValue;
          case 'emoji':
            const {url} = chatValue && emojis.find(emv => emv.text === chatValue) || {};
            return url ? <img key={index} src={url} className="message-content-emoji" /> :
              `[${chatValue}]`;
          default:
            return v;
        }
        // const emojiText = ((found || []).shift() || '').replace(/(\[|\])+/g, '');
        // console.log(v);
        // console.log(found);
        // console.log(emojiText);
        // const {url} = emojiText && emojis.find(emv => emv.text === emojiText) || {};
        // return url && <img key={index} src={url} className="message-content-emoji" />;
      });
      let lastDomRef = {};
      if (!itemIndex) {
        //第一个元素
        if (!firstDom) {
          // firstDom 为空时 第一次render
          firstDom = timestamp;
        } else if ((firstDom !== timestamp)) {
          // 执行了unshift操作
          const unshiftLastIndex = (data.findIndex(v => v.timestamp === firstDom)) - 1;
          unshiftLastTimestamp = data[unshiftLastIndex].timestamp;
          isUnshift = true;
        } else {
          isUnshift = false;
        }
      } else if (unshiftLastTimestamp === timestamp) {
        lastDomRef = {ref: unshiftLastTimestamp};
        lastDom = unshiftLastTimestamp;
        //reset
        firstDom = data[0].timestamp;
        unshiftLastTimestamp = '';
      } else if (!isUnshift && (data.length === (itemIndex + 1))) {
        lastDomRef = {ref: timestamp};
        lastDom = timestamp;
      }
      const isOwn = userId.toString() === ownUserId.toString();
      return (<div key={timestamp} {...lastDomRef}>
        {timeInfoNode}
        <div className={`message-item ${isOwn ? 'message-item-own' : 'message-item-other'}`}>
          <div onClick={() => this.userAvatarClick(userInfo)}>
            <img
              className="message-item-avatar"
              src={avatar}
            />
          </div>
          <p className="message-item-content">
            {content}
            {isOwn && error && <span className="error-status" ><img src={errorIcon} /></span>}
          </p>
        </div>
      </div>);
    });
  }
  render() {
    const {dataSource = [], loading = false, loader} = this.props;
    return (
      <div className="message-list-wrapper">
        {loading && <div className="message-loading">
          {loader || this.loaderContent()}
        </div>}
        {this.renderMessageList(dataSource)}
      </div>
    );
  }
}
