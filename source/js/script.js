"use strict";

function visible(jqueryElem) {
    return jqueryElem.length && !jqueryElem.is(":hidden");
}

// https://jsfiddle.net/mekwall/up4nu/
function scrollSpy(menuSelector, offset, activeClassName) {
    var menu = $(menuSelector);
    if(!visible(menu))
        return;
    offset = offset || 0;
    activeClassName = activeClassName || "active";

    var lastId, active = $(),
    menuHeight = menu.outerHeight() + offset,
    scollTarget = menu.find("a").map(function() {
        var item = $($(this).attr("href"));
        if (item.length)
            return item[0]; // avoid becoming 2-dim jquery array
    });

    $(window).scroll(function() {
        // Get container scroll position
        var fromTop = $(this).scrollTop() + menuHeight;

        // Get id of current scroll item
        var id = scollTarget.filter(function() {
            return $(this).offset().top < fromTop;
        }).last().attr("id") || "";

        if (lastId !== id) {
            active.removeClass(activeClassName);
            var newActive = [];

            for(var target = menu.find("[href='#" + id + "']");
                target.length && !target.is(menu);
                target = target.parent()) {
                if(target.is("li"))
                    newActive.push(target[0]);
            }
            active = $(newActive).addClass(activeClassName).trigger("scrollspy");
            lastId = id;
        }
    });
}

/* https://stackoverflow.com/a/901144 */
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function searchFunc(path, search_str, content_id) {
    $.ajax({
        url: path,
        dataType: "xml",
        success: function(response) {
            var query = $("entry", response).map(function() {
                return {
                    title: $("title", this).text(),
                    content: function(html) {
                        // .html() can oly get its first child, so wrap in a div
                        var wrapper = $("<div>"+ html +"</div>");
                        // remove style/script in post content
                        wrapper.find("script,style").remove();
                        // remove code line number
                        $(".gutter",wrapper).remove();
                        return wrapper.html();
                    }($("content", this).text()),
                    url: $("url", this).text()
                }
                }).get(),
                container = $('#' + content_id);
            search_str = search_str.trim();
            if(search_str.length == 0)
                return;

            var html = '',
                keywords = search_str.toLowerCase().split(/[\s\-]+/);
            query.forEach(function(data) {
                var isMatch = true;
                var data_title = data.title.trim().toLowerCase();
                var data_content = data.content.trim().replace(/<[^>]+>/g,"").toLowerCase();
                var index_title = -1;
                var index_content = -1;
                var first_occur = -1;
                // only match articles with non-empty titles and contents
                if(data_title && data_content) {
                    keywords.forEach(function(keyword, i) {
                        index_title = data_title.indexOf(keyword);
                        index_content = data_content.indexOf(keyword);
                        if( index_title < 0 && index_content < 0 )
                            isMatch = false;
                        else {
                            if (index_content < 0)
                                index_content = 0;
                            if (!i)
                                first_occur = index_content;
                        }
                    });
                }
                // show search results
                if (isMatch) {
                    html += '<section class="post">';
                    html += '<header class="post-header"><h2 class="post-title"><a href="' + data.url + '" class="search-result-title">' + data.title + "</a></h2></header>";
                    var content = data.content.trim().replace(/<[^>]+>/g,"");
                    if (first_occur >= 0) {
                        // cut out 100 characters
                        var start = first_occur - 20;
                        var end = first_occur + 80;
                        if(start < 0)
                            start = 0;
                        else if(!start)
                            end = 100;
                        if(end > content.length)
                            end = content.length;
                        var match_content = content.substring(start, end);
                        // highlight all keywords
                        keywords.forEach(function(keyword) {
                            match_content = match_content.replace(new RegExp(keyword, "gi"), '<span class="search-keyword">' + keyword + '</span>');
                        });
                        html += '<article class="post-body">' + (0 == start ? "" : "...") + match_content + (end == content.length ? "" : "...") + '</article>';
                    }
                    html += "</section>"; // section.post
                }
            });
            if(!html)
                $("#no-match").removeClass("matched");
            container.html('<div class="search-result-list">' + html + "</div>");
        }
    });
}

// common widgets
$(function() {
    // sidebar part
    $(".widget.widget-links").load("/components/links.html");
    $(".widget.recent-posts").load("/components/recent-posts.html", function(response, status) {
        if ("success" === status) {
            var suffix = $(this).find("ul.list").attr("data-suffix"),
                now = new Date().getTime();
            $(this).find("span.update-time").each(function() {
                var time = new Date($(this).attr("data-date")).getTime(),
                    diff = Math.ceil((now - time) / 864e5);
                if(10 >= diff)
                    $(this).html(diff + suffix);
            });
        }
    });
});

// dropdown navigation menu
$(function() {
    var timer, selected = false;
    $(".dropdown").hover(function() {
        var dropdown = $(this);
        if(timer) {
            clearTimeout(timer);
            timer = null;
        }
        if(!dropdown.hasClass("selected")) {
            dropdown.addClass("selected");
            selected = true;
        }
    }, function() {
        var dropdown = $(this);
        if(dropdown.hasClass("selected") && selected) {
            timer = setTimeout(function() {
                dropdown.removeClass("selected");
                selected = false;
                clearTimeout(timer);
                timer = null;
            }, 100);
        }
    });

    $("#global-nav").click(function() {
        // to make this still effective on window resize,
        // don't put the if-condition below out of click listener
        if ($(window).width() < 768) {
            $(this).children(".gnul").toggleClass("collapse");
        }
    });
});

// totop widget
$(function() {
    var totop = $("#totop"),
        canvas = $("#totop-canvas"),
        percent = $("#totop-percent"),
        width = canvas.width(),
        height = canvas.height(),
        center = width / 2,
        radius = parseInt((width - 3) / 2),
        ctx = canvas[0].getContext("2d");
    function draw_circle(color, percent) {
        ctx.beginPath();
        ctx.arc(center, center, radius, - Math.PI / 2, Math.PI * 1.5 * percent, false);
        ctx.strokeStyle = color;
        ctx.lineCap = "round"; // butt, round or square
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    totop.click(function() {
        $("body, html").animate({
            scrollTop: 0
        }, 800);
    });

    $(window).scroll(function() {
        var docHeight = $(document).height() - $(window).height(),
            scrollTop = $(window).scrollTop(),
            per = parseInt(scrollTop / docHeight * 100);
        if (scrollTop >= 200) {
            totop.addClass("display");
            ctx.clearRect(0, 0, width, height);
            draw_circle('#efefef', 1);
            draw_circle('#555555', per/100);
        } else
            totop.removeClass("display");
        percent.attr("data-percent", per);
    });
});

// toc
$(function() {
    var tocContainer = $("#toc");
    if(!visible(tocContainer))
        return;
    var toc = tocContainer.children(), tocHeight,
        post = $(".post-body"), posMax;
    function updateMax() {
        var postHeight = post.position().top + post.outerHeight(),
            containerHeight = tocContainer.height();
        posMax = postHeight - containerHeight;
        tocHeight = toc.height();
    };
    // initialize when full loaded
    $(window).on("load", updateMax);
    // update posMax on window resizing
    $(window).resize(updateMax);
    scrollSpy(tocContainer);
    $(window).scroll(function() {
        var scrollTop = $(window).scrollTop();
        var top;
        if(scrollTop < 55) // 55 == header.height(55px)
            top = 90 - scrollTop; // 90 == #toc.top(90px)
        else if(posMax > scrollTop)
            top = 35;
        else
            top = posMax - scrollTop;
        tocContainer.css("top", top);
    });

    $(".toc-item").on("scrollspy", function() {
        var tocTop = toc.scrollTop(),
            link = $(this).children(".toc-link"),
            thisTop = link.position().top;
        // make sure the highlighted element contains no child
        if($(this).height() != link.height())
            return;
        // if the highlighted element is above current view of toc
        if(thisTop <= 0)
            toc.scrollTop(tocTop + thisTop);
        // else if below current view of toc
        else if(tocHeight <= thisTop)
            toc.scrollTop(tocTop + thisTop + link.outerHeight() - tocHeight);
    });
});

// footnotes
$(function() {
    if(!$(".footnotes").length)
        return;

    function position() {
        var content = $(".fn-content").removeAttr("style");
        if($(window).width() < 640)
            content.css("width",$(window).width()/2);
        else
            content.css("width",340); // default value
        content.each(function() {
            var width = $(this).children(".fn-text").outerWidth();
            $(this).css({
                "width": width,
                "margin-left": width/-2
            });
        });
    };
    $(".footnote-ref").each(function() {
        var footnote = $($(this).children("a").attr("href")),
            outer_wrapper = $("<span>", {"class" :"fn-content"}),
            inner_wrapper = $("<span>", {"class" :"fn-text"});
        footnote.find(".footnote-backref").remove();
        $(this).append(outer_wrapper.append(inner_wrapper.html(footnote.html())));
    });
    position();
    $(window).resize(position);

    var target = $(".fn-content");
    $(document).click(function(t) {
        var clicked = $(t.target);
        if(target.is(clicked) || target.has(clicked).length)
            t.stopPropagation();
        else {
            var parent = clicked.parents(".footnote-ref"),
                active = $(".footnote-ref.active");
            if(!active.is(parent))
                active.removeClass("active");
            if(parent.length)
                parent.toggleClass("active");
        }
    });
});

// archive navigator
$(function() {
    var nav = $("#archive-nav");
    if(!visible(nav))
        return;

    var pageHeight = $("#primary").position().top + $("#primary").outerHeight(),
        navMax = pageHeight - nav.height();
    scrollSpy("#archive-nav");
    $(window).scroll(function() {
        var scrollTop = $(window).scrollTop();
        if(scrollTop < 55) // 55 == header.height(55px)
            nav.css({top: 115 - scrollTop});
        else if(navMax > scrollTop)
            nav.css({top: 60}); // 60 == archive-nav.top(115px) - header.height(55px)
        else
            nav.css({top: navMax - scrollTop});
    });
});
