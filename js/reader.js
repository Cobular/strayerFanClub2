var Config = (function(){
  var LOCALSTORAGE_KEY = "strayer_reader_config"

  var DEFAULT_CONFIG = {
    darkMode: false
  }

  var get = function(configVar){
    if(!localStorage[LOCALSTORAGE_KEY]) localStorage[LOCALSTORAGE_KEY] = JSON.stringify(DEFAULT_CONFIG)
    var config = JSON.parse(localStorage[LOCALSTORAGE_KEY])
    return config[configVar]
  }

  var set = function(configVar, value){
    if(!localStorage[LOCALSTORAGE_KEY]) localStorage[LOCALSTORAGE_KEY] = JSON.stringify(DEFAULT_CONFIG)
    var config = JSON.parse(localStorage[LOCALSTORAGE_KEY])
    config[configVar] = value
    localStorage[LOCALSTORAGE_KEY] = JSON.stringify(config)
    return value
  }

  return { get, set }
}())

var Book = (function(){
  var bookPages
  console.log("Reader.js loading...")

  var currentPageIndex = 0
  
  var getPage = function(pageId){
    return $.grep(bookPages, function(e){ return e.page_id == pageId })[0]
  }

  var loadPageByIndex = function(index){
    loadPage(bookPages[index].page_id)
  }

  var loadPage = function(pageId){
    $.get("/pages/" + pageId + ".html", function(res){
      var page = getPage(pageId)
      currentPageIndex = bookPages.indexOf(page)
      $("#page-inner").html(res)
      $("#page-inner img").toArray().forEach(img => {
        $(img).attr("src", `http://www.highschool.bfwpub.com/BrainHoney/Resource/6696/ebooks.bfwpub.com/strayer1e/sections/${$(img).attr("src")}`)
        $(img).parent().attr("href", $(img).attr("src")).attr("target", "_blank")
      })

      $("#page-inner #content").prepend($("<h3>").text(page.title))
      window.location.hash = "#" + pageId
      $("#page").scrollTop(0)
      
      if(page.title === "Second Thoughts"){
        $.each($(".table_wrap p"), function(index, cell){
          $(cell).find("span").last().addClass("clickable")
          $(cell).click(function(){
            $("#search_input").val($(cell).text().replace(/[“”"]/gi, "") + " chapter:" + pageId.split("_")[0])
            $("#search_form").submit()
          })
        })
      }
    })
  }

  $.getJSON("/pages.json", (pages) => {
    bookPages = pages

    if(window.location.hash.startsWith("#")){
      // console.log("hi", $.grep(pages, function(e){ return e.page_id == window.location.hash.substr(1) }))
      var bookmarkedPage = $.grep(pages, function(e){ return e.page_id == window.location.hash.substr(1) })[0]
      loadPage(bookmarkedPage.page_id)
    }
    
    pages.forEach((page) => {
      $("#sidebar").append($("<div class='sidebar-page'>").text(page.title).addClass("indent-" + (page.page_id.split("_").length - 1)).click(function(){
        $("#search-results").fadeOut("fast")
        $("#page-inner").fadeIn("fast")
        loadPage(page.page_id)
      }))
    })
  })

  var toggleDarkMode = function(){
    var darkMode = Config.set("darkMode", !Config.get("darkMode"))

    if(darkMode){
      $("body").addClass("dark")
    }else{
      $("body").removeClass("dark")
    }

    return darkMode
  }

  $(document).ready(function(){
    // Initialize Reader
    var darkMode = Config.get("darkMode")

    if(darkMode){
      $("body").addClass("dark")
    }

    $("#close-search").click(function(){
      $("#search-results").fadeOut("fast")
      $("#page-inner").fadeIn("fast")
    })

    $("body").keypress(function(event){
      if($(event.target).closest("input")[0]){
        return;
      }
      console.log(event)
      switch(event.keyCode){
        case 100: // D
          toggleDarkMode()
          break
        case 37: // Left Arrow
        case 75: // K
        case 107: // K (again)
          console.log(currentPageIndex)
          loadPageByIndex(currentPageIndex - 1)
          break
        case 39: // Right Arrow
        case 74: // J
        case 106: // J (again)
          loadPageByIndex(currentPageIndex + 1)
          break
        default:
          break
      }
    })

    $("#search_form").submit(function(e){
      e.preventDefault()
      $(".search-result").remove()
      $("#search-results").fadeIn("fast")
      $("#page-inner").fadeOut("fast")
      $.getJSON("/search.json?q=" + encodeURIComponent($("#search_input").val()), function(res){
        // console.log(results)
        var results = res.results.sort(function(a, b){
          return b.occurrences - a.occurrences
        })
        
        if(results.length === 0){
          var $result = $("<div>").append(
                        $("<h3>")
                          .text("No results... :("))
                        .append(
                        $("<div>")
                          .addClass("small")
                          .text("try searching \"China\", \"individualism\", \"pastoral\""))
                        .addClass("search-result fake")
          $("#actual-results").append($result)
        }

        $("#search-results-inner h1").text(`Results for "${res.query}"${res.filters.chapter ? ` in chapter ${res.filters.chapter}` : ""}`)

        results.forEach(function(result){
          var page = getPage(result.page)
          console.log("page", page)
          var $result = $("<div>").append(
                                  $("<h3>")
                                    .text(page.title))
                                  .append(
                                  $("<div>")
                                    .addClass("small")
                                    .text("chapter " + result.page.split("_")[0] + ", " + result.occurrences + " occurrences"))
                                  .append(result.excerpt.replace(/\</gi, "&lt;").replace(/\>/gi, "&gt;").replace(new RegExp("(" + res.query + ")", "gi"), "<b>$1</b>"))
                                  .addClass("search-result")
                                  .click(function(){
                                    loadPage(page.page_id)
                                    $("#search-results").fadeOut("fast")
                                    $("#page-inner").fadeIn("fast")
                                  })
          $("#actual-results").append($result)
        })
      })
    })
  })

  var getCurrentPage = function(){
    return {
      index: currentPageIndex,
      page: bookPages[currentPageIndex]
    }
  }

  return { loadPage, getCurrentPage }
}())

// Functions for retrofitting the stupid javascript functions the original textbook pages use
var JumpToPageNumber = function(page){
  Book.loadPage(page.replace(/\./gi, "_"))
}

var JumpToChapter = function(chapter){
  Book.loadPage(chapter + "_0")
}