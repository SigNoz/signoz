import pytest
from selenium import webdriver


@pytest.fixture(name="driver", scope="function")
def driver() -> webdriver.Chrome:
    """
    Get a driver for the browser. This is not a fixture, it is a helper function to get a driver for the browser.
    """

    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--incognito")
    options.add_argument("--disable-extensions")
    options.add_argument("--remote-debugging-port=9222")
    options.add_argument("--disable-dev-shm-usage")

    _driver = webdriver.Chrome(options=options)
    yield _driver

    _driver.quit()
